from apps.messaging.application.interfaces import (
    AbstractMessagingRepository,
    AbstractNotificationRecorder,
    AbstractRealtimeNotifier,
)
from apps.messaging.application.use_cases.list_messages import ListMessagesUseCase
from apps.messaging.application.use_cases.send_message import (
    SendMessageUseCase,
    realtime_group_name,
    validate_exactly_one_target,
)
from apps.messaging.domain.exceptions import (
    MessageDeleteForbiddenError,
    MessageEditForbiddenError,
    MessageTargetNotFoundError,
)
from apps.messaging.domain.models import MessageEntity, MessagePage
from apps.permissions.domain.checker import has_permission
from apps.permissions.domain.permissions import PermissionCode


__all__ = [
    "DeleteMessageUseCase",
    "EditMessageUseCase",
    "ListMessagesUseCase",
    "SearchMessagesUseCase",
    "SendMessageUseCase",
    "validate_exactly_one_target",
]


# Send/list live in their SCRUM-38 modules. These imports deliberately keep the
# previous public import path working for callers added during SCRUM-37.


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
        if message.sender_id != user_id and not self._can_moderate(message, user_id):
            raise MessageDeleteForbiddenError(
                "You cannot delete this message globally."
            )
        self._repository.delete_message(base_message_id)
        if self._notifier is not None or self._notification_recorder is not None:
            group_name = realtime_group_name(
                topic_id=message.topic_id,
                group_id=message.group_id,
                direct_chat_id=message.direct_chat_id,
            )
            payload = {"base_message_id": base_message_id}
            if self._notifier is not None:
                self._notifier.notify(group_name, "MESSAGE_DELETED", payload)
            if self._notification_recorder is not None:
                recipient_ids = self._repository.list_target_member_ids(
                    topic_id=message.topic_id,
                    group_id=message.group_id,
                    direct_chat_id=message.direct_chat_id,
                    user_id=message.sender_id,
                )
                self._notification_recorder.record(
                    recipient_ids, "MESSAGE_DELETED", payload
                )

    def _can_moderate(self, message: MessageEntity, user_id: int) -> bool:
        if message.topic_id is not None:
            granted = self._repository.get_permissions_for_topic(
                message.topic_id, user_id
            )
            return has_permission(granted, PermissionCode.DELETE_MESSAGES.value)
        if message.group_id is not None:
            return self._repository.is_group_admin(message.group_id, user_id)
        return False
