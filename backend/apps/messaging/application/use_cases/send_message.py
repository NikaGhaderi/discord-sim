from apps.messaging.application.interfaces import (
    AbstractMessagingRepository,
    AbstractNotificationRecorder,
    AbstractRealtimeNotifier,
)
from apps.messaging.domain.exceptions import MessageTargetForbiddenError
from apps.messaging.domain.models import MessageEntity, validate_exactly_one_target


def realtime_group_name(
    *,
    topic_id: int | None,
    group_id: int | None,
    direct_chat_id: int | None,
) -> str:
    if topic_id is not None:
        return f"topic_{topic_id}"
    if group_id is not None:
        return f"group_{group_id}"
    return f"direct_chat_{direct_chat_id}"


def message_payload(message: MessageEntity) -> dict:
    return {
        "base_message_id": message.id,
        "sender_id": message.sender_id,
        "content": message.body,
        "sent_at": message.created_at.isoformat(),
        "is_edited": message.is_edited,
        "media": [
            {"file_url": media.file_url, "file_type": media.file_type}
            for media in message.media
        ],
    }


class SendMessageUseCase:
    def __init__(
        self,
        repository: AbstractMessagingRepository,
        notifier: AbstractRealtimeNotifier | None = None,
        notification_recorder: AbstractNotificationRecorder | None = None,
    ) -> None:
        self._repository = repository
        self._notifier = notifier
        self._notification_recorder = notification_recorder

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
            raise MessageTargetForbiddenError(
                "You are not a member of this message target."
            )
        message = self._repository.create_message(
            sender_id,
            content,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        )
        if self._notifier is not None or self._notification_recorder is not None:
            group_name = realtime_group_name(
                topic_id=topic_id,
                group_id=group_id,
                direct_chat_id=direct_chat_id,
            )
            payload = message_payload(message)
            if self._notifier is not None:
                self._notifier.notify(group_name, "NEW_MESSAGE", payload)
            if self._notification_recorder is not None:
                recipient_ids = self._repository.list_target_member_ids(
                    topic_id=topic_id,
                    group_id=group_id,
                    direct_chat_id=direct_chat_id,
                    user_id=sender_id,
                )
                self._notification_recorder.record(
                    recipient_ids,
                    "NEW_MESSAGE",
                    payload,
                )
        return message
