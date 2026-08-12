from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from apps.messaging.application.use_cases.edit_message import EditMessageUseCase
from apps.messaging.domain.exceptions import MessageEditForbiddenError
from apps.messaging.domain.models import MessageEntity


def _message(sender_id: int = 1) -> MessageEntity:
    return MessageEntity(
        id=10,
        sender_id=sender_id,
        topic_id=5,
        group_id=None,
        direct_chat_id=None,
        body="old body",
        is_edited=False,
        created_at=datetime.now(timezone.utc),
    )


def test_edit_message_is_sender_only():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1)

    with pytest.raises(MessageEditForbiddenError):
        EditMessageUseCase(repository).execute(10, 2, "new body")

    repository.get_permissions_for_topic.assert_not_called()
    repository.write_message_edit.assert_not_called()


def test_edit_message_uses_atomic_repository_operation_for_sender():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1)
    updated = _message(sender_id=1)
    updated.body = "new body"
    updated.is_edited = True
    repository.write_message_edit.return_value = updated

    result = EditMessageUseCase(repository).execute(10, 1, "new body")

    assert result is updated
    repository.write_message_edit.assert_called_once_with(10, "new body")
