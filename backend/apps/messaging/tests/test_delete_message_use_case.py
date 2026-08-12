from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from apps.messaging.application.use_cases.delete_message import DeleteMessageUseCase
from apps.messaging.domain.exceptions import MessageDeleteForbiddenError
from apps.messaging.domain.models import MessageEntity


def _message(*, sender_id: int = 1, topic_id: int | None = 5) -> MessageEntity:
    return MessageEntity(
        id=10,
        sender_id=sender_id,
        topic_id=topic_id,
        group_id=7 if topic_id is None else None,
        direct_chat_id=None,
        body="body",
        is_edited=False,
        created_at=datetime.now(timezone.utc),
    )


def test_sender_can_delete_without_permission_lookup():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1)

    DeleteMessageUseCase(repository).execute(10, 1)

    repository.get_permissions_for_topic.assert_not_called()
    repository.delete_message.assert_called_once_with(10)


def test_delete_messages_permission_allows_channel_message_delete():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1, topic_id=5)
    repository.get_permissions_for_topic.return_value = ["DELETE_MESSAGES"]

    DeleteMessageUseCase(repository).execute(10, 2)

    repository.get_permissions_for_topic.assert_called_once_with(5, 2)
    repository.delete_message.assert_called_once_with(10)


def test_non_sender_without_permission_cannot_delete():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1, topic_id=5)
    repository.get_permissions_for_topic.return_value = []

    with pytest.raises(MessageDeleteForbiddenError):
        DeleteMessageUseCase(repository).execute(10, 2)

    repository.delete_message.assert_not_called()


def test_group_admin_has_no_channel_permission_escalation_path():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1, topic_id=None)

    with pytest.raises(MessageDeleteForbiddenError):
        DeleteMessageUseCase(repository).execute(10, 2)

    repository.get_permissions_for_topic.assert_not_called()
    repository.is_group_admin.assert_not_called()
    repository.delete_message.assert_not_called()
