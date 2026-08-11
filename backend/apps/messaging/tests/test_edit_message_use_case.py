from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from apps.messaging.application.use_cases.edit_message import EditMessageUseCase
from apps.messaging.domain.exceptions import MessageEditForbiddenError
from apps.messaging.domain.models import MessageEntity


def _message(sender_id: int = 1) -> MessageEntity:
    return MessageEntity(
        base_message_id=10,
        sender_id=sender_id,
        content="old body",
        sent_at=datetime.now(timezone.utc),
        is_edited=False,
        topic_id=5,
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
    updated.content = "new body"
    updated.is_edited = True
    repository.write_message_edit.return_value = updated

    result = EditMessageUseCase(repository).execute(10, 1, "new body")

    assert result is updated
    repository.write_message_edit.assert_called_once_with(10, "new body")
