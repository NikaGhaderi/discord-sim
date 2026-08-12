from apps.messaging.application.interfaces import (
    AbstractMessagingRepository,
    AbstractNotificationRecorder,
    AbstractRealtimeNotifier,
)
from apps.messaging.domain.exceptions import MessageDeleteForbiddenError
from apps.messaging.domain.models import MessageEntity
from apps.permissions.domain.checker import has_permission
from apps.permissions.domain.permissions import PermissionCode


def _realtime_group_name(message: MessageEntity) -> str:
    if message.topic_id is not None:
        return f"topic_{message.topic_id}"
    if message.group_id is not None:
        return f"group_{message.group_id}"
    return f"direct_chat_{message.direct_chat_id}"


class DeleteMessageUseCase:
    def __init__(
        self,
        repository: AbstractMessagingRepository,
        notifier: AbstractRealtimeNotifier | None = None,
        notification_recorder: AbstractNotificationRecorder | None = None,
    ) -> None:
        self._repository = repository
        self._notifier = notifier
        self._notification_recorder = notification_recorder

    def execute(self, base_message_id: int, user_id: int) -> None:
        message = self._repository.get_message(base_message_id)
        if message.sender_id != user_id and not self._can_delete_channel_message(
            message, user_id
        ):
            raise MessageDeleteForbiddenError(
                "You cannot delete this message globally."
            )

        # The ORM relation uses on_delete=CASCADE, so this hard delete also
        # removes the message's history and media rows.
        self._repository.delete_message(base_message_id)
        self._publish_deleted(message)

    def _can_delete_channel_message(
        self,
        message: MessageEntity,
        user_id: int,
    ) -> bool:
        if message.topic_id is None:
            return False
        granted = self._repository.get_permissions_for_topic(
            message.topic_id,
            user_id,
        )
        return has_permission(granted, PermissionCode.DELETE_MESSAGES.value)

    def _publish_deleted(self, message: MessageEntity) -> None:
        if self._notifier is None and self._notification_recorder is None:
            return

        payload = {"base_message_id": message.id}
        if self._notifier is not None:
            self._notifier.notify(
                _realtime_group_name(message),
                "MESSAGE_DELETED",
                payload,
            )
        if self._notification_recorder is not None:
            recipient_ids = self._repository.list_target_member_ids(
                topic_id=message.topic_id,
                group_id=message.group_id,
                direct_chat_id=message.direct_chat_id,
                user_id=message.sender_id,
            )
            self._notification_recorder.record(
                recipient_ids,
                "MESSAGE_DELETED",
                payload,
            )
