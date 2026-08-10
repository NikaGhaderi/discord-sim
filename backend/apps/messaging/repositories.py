from typing import BinaryIO

from django.contrib.postgres.search import SearchQuery, SearchVector
from django.db import transaction
from django.db.models import QuerySet

from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import MessageNotFoundError
from apps.messaging.domain.models import MediaEntity, MessageEntity, MessagePage
from apps.messaging.models import Media, Message, MessageHistory
from apps.permissions.domain.checker import has_permission
from apps.permissions.domain.permissions import PermissionCode
from apps.private_spaces.models import GroupMember
from apps.private_spaces.repositories import DjangoPrivateSpacesRepository
from apps.workspaces.models import Topic
from apps.workspaces.repositories import DjangoChannelRepository


def _to_media_entity(media: Media) -> MediaEntity:
    return MediaEntity(
        media_id=media.id,
        base_message_id=media.base_message_id,
        file_url=media.file.url,
        file_type=media.file_type,
        file_size=media.file_size,
    )


def _to_message_entity(message: Message) -> MessageEntity:
    prefetched_media = list(message.media.all())
    return MessageEntity(
        base_message_id=message.pk,
        sender_id=message.sender_id,
        content=message.content,
        sent_at=message.sent_at,
        is_edited=message.is_edited,
        topic_id=message.topic_id,
        group_id=message.group_id,
        direct_chat_id=message.direct_chat_id,
        media=[_to_media_entity(item) for item in prefetched_media],
    )


class DjangoMessagingRepository(AbstractMessagingRepository):
    def __init__(self) -> None:
        self._channels = DjangoChannelRepository()
        self._private_spaces = DjangoPrivateSpacesRepository()

    @staticmethod
    def _messages() -> QuerySet:
        return Message.objects.select_related(
            "sender", "topic", "group", "direct_chat"
        ).prefetch_related("media")

    @staticmethod
    def _target_filter(
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
    ) -> dict:
        if topic_id is not None:
            return {"topic_id": topic_id}
        if group_id is not None:
            return {"group_id": group_id}
        return {"direct_chat_id": direct_chat_id}

    def can_access_target(
        self,
        user_id: int,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
    ) -> bool:
        if topic_id is not None:
            topic = Topic.objects.filter(pk=topic_id).first()
            return bool(topic and self._channels.is_member(topic.channel_id, user_id))
        if group_id is not None:
            return self._private_spaces.is_group_member(group_id, user_id)
        if direct_chat_id is not None:
            return (
                self._private_spaces.get_direct_chat_for_participant(
                    direct_chat_id, user_id
                )
                is not None
            )
        return False

    def create_message(
        self,
        sender_id: int,
        content: str,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
    ) -> MessageEntity:
        with transaction.atomic():
            message = Message.objects.create(
                sender_id=sender_id,
                content=content,
                topic_id=topic_id,
                group_id=group_id,
                direct_chat_id=direct_chat_id,
            )
        return _to_message_entity(self._messages().get(pk=message.pk))

    def list_messages(
        self,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
        limit: int,
        offset: int,
    ) -> MessagePage:
        queryset = self._messages().filter(
            **self._target_filter(
                topic_id=topic_id,
                group_id=group_id,
                direct_chat_id=direct_chat_id,
            )
        )
        count = queryset.count()
        results = queryset[offset : offset + limit]
        return MessagePage(
            count=count, results=[_to_message_entity(m) for m in results]
        )

    def search_messages(
        self,
        query: str,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
        limit: int,
        offset: int,
    ) -> MessagePage:
        queryset = (
            self._messages()
            .annotate(search=SearchVector("content"))
            .filter(
                search=SearchQuery(query),
                **self._target_filter(
                    topic_id=topic_id,
                    group_id=group_id,
                    direct_chat_id=direct_chat_id,
                ),
            )
        )
        count = queryset.count()
        results = queryset[offset : offset + limit]
        return MessagePage(
            count=count, results=[_to_message_entity(m) for m in results]
        )

    def can_attach_media(self, base_message_id: int, user_id: int) -> bool:
        message = Message.objects.filter(pk=base_message_id).first()
        if message is None or message.sender_id != user_id:
            return False
        if message.topic_id is None:
            return True
        granted = self._channels.get_user_permissions(message.topic.channel_id, user_id)
        return has_permission(granted, PermissionCode.SEND_MEDIA.value)

    def attach_media(
        self,
        base_message_id: int,
        uploaded_file: BinaryIO,
        file_type: str,
        file_size: int,
    ) -> MediaEntity:
        media = Media.objects.create(
            base_message_id=base_message_id,
            file=uploaded_file,
            file_type=file_type,
            file_size=file_size,
        )
        return _to_media_entity(media)

    def get_message(self, base_message_id: int) -> MessageEntity:
        message = Message.objects.filter(pk=base_message_id).first()
        if message is None:
            raise MessageNotFoundError("Message not found.")
        return _to_message_entity(message)

    def write_message_edit(self, base_message_id: int, content: str) -> MessageEntity:
        with transaction.atomic():
            message = (
                Message.objects.select_for_update().filter(pk=base_message_id).first()
            )
            if message is None:
                raise MessageNotFoundError("Message not found.")
            MessageHistory.objects.create(
                base_message_id=base_message_id,
                old_content=message.content,
            )
            message.content = content
            message.is_edited = True
            message.save(update_fields=("content", "is_edited"))
        return _to_message_entity(self._messages().get(pk=base_message_id))

    def delete_message(self, base_message_id: int) -> None:
        deleted_count, _ = Message.objects.filter(pk=base_message_id).delete()
        if deleted_count == 0:
            raise MessageNotFoundError("Message not found.")

    def get_permissions_for_topic(self, topic_id: int, user_id: int) -> list[str]:
        topic = Topic.objects.filter(pk=topic_id).first()
        if topic is None:
            return []
        return self._channels.get_user_permissions(topic.channel_id, user_id)

    def is_group_admin(self, group_id: int, user_id: int) -> bool:
        return GroupMember.objects.filter(
            group_id=group_id,
            user_id=user_id,
            is_admin=True,
        ).exists()

    def list_target_member_ids(
        self,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
        user_id: int,
    ) -> list[int]:
        if topic_id is not None:
            topic = Topic.objects.filter(pk=topic_id).first()
            if topic is None:
                return []
            member_ids = [
                m.user_id for m in self._channels.list_members(topic.channel_id)
            ]
        elif group_id is not None:
            member_ids = [
                m.user_id for m in self._private_spaces.list_group_members(group_id)
            ]
        elif direct_chat_id is not None:
            chat = self._private_spaces.get_direct_chat_for_participant(
                direct_chat_id, user_id
            )
            member_ids = [chat.user1_id, chat.user2_id] if chat is not None else []
        else:
            member_ids = []
        return [uid for uid in member_ids if uid != user_id]
