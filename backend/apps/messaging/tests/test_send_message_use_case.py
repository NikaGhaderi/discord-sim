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
        id=10,
        sender_id=1,
        topic_id=5,
        group_id=None,
        direct_chat_id=None,
        body="Hello",
        is_edited=False,
        created_at=datetime.now(timezone.utc),
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
    repository.get_permissions_for_topic.return_value = ["SEND_MESSAGES"]
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


def test_send_message_creates_message_for_group_member_without_a_permission_check():
    # Groups/DMs have no permission concept -- membership alone is enough,
    # so get_permissions_for_topic must never even be consulted.
    repository = Mock()
    repository.can_access_target.return_value = True
    created_message = _message()
    created_message.topic_id = None
    created_message.group_id = 7
    repository.create_message.return_value = created_message

    result = SendMessageUseCase(repository).execute(1, "Hello", group_id=7)

    assert result is created_message
    repository.get_permissions_for_topic.assert_not_called()


def test_send_message_rejects_a_topic_member_without_send_messages_permission():
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.get_permissions_for_topic.return_value = []

    with pytest.raises(MessageTargetForbiddenError):
        SendMessageUseCase(repository).execute(1, "Hello", topic_id=5)

    repository.create_message.assert_not_called()
