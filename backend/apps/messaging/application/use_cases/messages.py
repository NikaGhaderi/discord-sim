from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import (
    InvalidMessageTargetError,
    MessageDeleteForbiddenError,
    MessageEditForbiddenError,
    MessageTargetNotFoundError,
)
from apps.messaging.domain.models import MessageEntity, MessagePage
from apps.permissions.domain.checker import has_permission
from apps.permissions.domain.permissions import PermissionCode


def validate_exactly_one_target(
    topic_id: int | None,
    group_id: int | None,
    direct_chat_id: int | None,
) -> None:
    if sum(value is not None for value in (topic_id, group_id, direct_chat_id)) != 1:
        raise InvalidMessageTargetError(
            "Exactly one of topic_id, group_id, or direct_chat_id must be set."
        )


class SendMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        sender_id: int,
        content: str,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
    ) -> MessageEntity:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if not self._repository.can_access_target(
            sender_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")
        return self._repository.create_message(
            sender_id,
            content,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        )


class ListMessagesUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        user_id: int,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> MessagePage:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if not self._repository.can_access_target(
            user_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")
        return self._repository.list_messages(
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
            limit=limit,
            offset=offset,
        )


class SearchMessagesUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        user_id: int,
        query: str,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> MessagePage:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if not self._repository.can_access_target(
            user_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")
        return self._repository.search_messages(
            query,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
            limit=limit,
            offset=offset,
        )


class EditMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self, base_message_id: int, user_id: int, content: str
    ) -> MessageEntity:
        message = self._repository.get_message(base_message_id)
        if message.sender_id != user_id:
            raise MessageEditForbiddenError("Only the sender can edit this message.")
        return self._repository.write_message_edit(base_message_id, content)


class DeleteMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(self, base_message_id: int, user_id: int) -> None:
        message = self._repository.get_message(base_message_id)
        if message.sender_id != user_id and not self._can_moderate(message, user_id):
            raise MessageDeleteForbiddenError(
                "You cannot delete this message globally."
            )
        self._repository.delete_message(base_message_id)

    def _can_moderate(self, message: MessageEntity, user_id: int) -> bool:
        if message.topic_id is not None:
            granted = self._repository.get_permissions_for_topic(
                message.topic_id, user_id
            )
            return has_permission(granted, PermissionCode.DELETE_MESSAGES.value)
        if message.group_id is not None:
            return self._repository.is_group_admin(message.group_id, user_id)
        return False
