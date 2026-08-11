from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from apps.messaging.application.use_cases.send_message import SendMessageUseCase
from apps.messaging.domain.exceptions import (
    InvalidMessageTargetError,
    MessageTargetForbiddenError,
)
from apps.messaging.domain.models import MessageEntity


def _message() -> MessageEntity:
    return MessageEntity(
        base_message_id=10,
        sender_id=1,
        content="Hello",
        sent_at=datetime.now(timezone.utc),
        is_edited=False,
        topic_id=5,
    )


def test_send_message_rejects_missing_or_multiple_targets():
    repository = Mock()
    use_case = SendMessageUseCase(repository)

    with pytest.raises(InvalidMessageTargetError):
        use_case.execute(1, "Hello")
    with pytest.raises(InvalidMessageTargetError):
        use_case.execute(1, "Hello", topic_id=5, group_id=7)

    repository.create_message.assert_not_called()


def test_send_message_rejects_non_member_before_creating_row():
    repository = Mock()
    repository.can_access_target.return_value = False

    with pytest.raises(MessageTargetForbiddenError):
        SendMessageUseCase(repository).execute(1, "Hello", group_id=7)

    repository.create_message.assert_not_called()


def test_send_message_creates_message_for_member():
    repository = Mock()
    repository.can_access_target.return_value = True
    created_message = _message()
    repository.create_message.return_value = created_message

    result = SendMessageUseCase(repository).execute(1, "Hello", topic_id=5)

    assert result is created_message
    repository.create_message.assert_called_once_with(
        1,
        "Hello",
        topic_id=5,
        group_id=None,
        direct_chat_id=None,
    )
