from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from apps.messaging.application.use_cases.messages import (
    DeleteMessageUseCase,
    SendMessageUseCase,
)
from apps.messaging.domain.exceptions import MessageDeleteForbiddenError
from apps.messaging.domain.models import MediaEntity, MessageEntity


def _message(**overrides) -> MessageEntity:
    defaults = dict(
        base_message_id=1,
        sender_id=10,
        content="hello",
        sent_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        is_edited=False,
        topic_id=None,
        group_id=None,
        direct_chat_id=None,
    )
    defaults.update(overrides)
    return MessageEntity(**defaults)


def test_send_message_notifies_the_topic_group_on_success():
    message = _message(topic_id=5)
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.create_message.return_value = message
    notifier = Mock()

    SendMessageUseCase(repository, notifier).execute(
        sender_id=10, content="hello", topic_id=5
    )

    notifier.notify.assert_called_once_with(
        "topic_5",
        "NEW_MESSAGE",
        {
            "base_message_id": 1,
            "sender_id": 10,
            "content": "hello",
            "sent_at": "2026-01-01T00:00:00+00:00",
            "is_edited": False,
            "media": [],
        },
    )


def test_send_message_notification_payload_includes_attached_media():
    message = _message(
        topic_id=5,
        media=[
            MediaEntity(
                media_id=1,
                base_message_id=1,
                file_url="/media/message_media/notes.txt",
                file_type="text/plain",
                file_size=42,
            )
        ],
    )
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.create_message.return_value = message
    notifier = Mock()

    SendMessageUseCase(repository, notifier).execute(
        sender_id=10, content="hello", topic_id=5
    )

    payload = notifier.notify.call_args.args[2]
    assert payload["media"] == [
        {"file_url": "/media/message_media/notes.txt", "file_type": "text/plain"}
    ]


def test_send_message_notifies_the_group_or_direct_chat_group_correctly():
    repository = Mock()
    repository.can_access_target.return_value = True
    notifier = Mock()

    repository.create_message.return_value = _message(group_id=7)
    SendMessageUseCase(repository, notifier).execute(
        sender_id=10, content="hi", group_id=7
    )
    assert notifier.notify.call_args.args[0] == "group_7"

    repository.create_message.return_value = _message(direct_chat_id=3)
    SendMessageUseCase(repository, notifier).execute(
        sender_id=10, content="hi", direct_chat_id=3
    )
    assert notifier.notify.call_args.args[0] == "direct_chat_3"


def test_send_message_works_with_no_notifier_configured():
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.create_message.return_value = _message(topic_id=5)

    # No notifier passed -- must not raise (e.g. AttributeError on None).
    result = SendMessageUseCase(repository).execute(
        sender_id=10, content="hello", topic_id=5
    )

    assert result.base_message_id == 1


def test_delete_message_notifies_after_the_repository_delete_succeeds():
    message = _message(topic_id=5, sender_id=10)
    repository = Mock()
    repository.get_message.return_value = message
    notifier = Mock()
    calls = []
    repository.delete_message.side_effect = lambda _id: calls.append("deleted")
    notifier.notify.side_effect = lambda *a: calls.append("notified")

    DeleteMessageUseCase(repository, notifier).execute(base_message_id=1, user_id=10)

    repository.delete_message.assert_called_once_with(1)
    notifier.notify.assert_called_once_with(
        "topic_5", "MESSAGE_DELETED", {"base_message_id": 1}
    )
    assert calls == ["deleted", "notified"]


def test_delete_message_works_with_no_notifier_configured():
    repository = Mock()
    repository.get_message.return_value = _message(topic_id=5, sender_id=10)

    # No notifier passed -- must not raise.
    DeleteMessageUseCase(repository).execute(base_message_id=1, user_id=10)

    repository.delete_message.assert_called_once_with(1)


def test_delete_message_does_not_notify_when_the_delete_is_forbidden():
    repository = Mock()
    repository.get_message.return_value = _message(
        topic_id=5, sender_id=10, group_id=None
    )
    repository.get_permissions_for_topic.return_value = []
    notifier = Mock()

    with pytest.raises(MessageDeleteForbiddenError):
        DeleteMessageUseCase(repository, notifier).execute(
            base_message_id=1, user_id=999
        )

    repository.delete_message.assert_not_called()
    notifier.notify.assert_not_called()


def test_send_message_records_a_notification_for_every_other_member():
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.create_message.return_value = _message(topic_id=5, sender_id=10)
    repository.list_target_member_ids.return_value = [11, 12]
    recorder = Mock()

    SendMessageUseCase(repository, notification_recorder=recorder).execute(
        sender_id=10, content="hello", topic_id=5
    )

    repository.list_target_member_ids.assert_called_once_with(
        topic_id=5, group_id=None, direct_chat_id=None, user_id=10
    )
    recorder.record.assert_called_once_with(
        [11, 12],
        "NEW_MESSAGE",
        {
            "base_message_id": 1,
            "sender_id": 10,
            "content": "hello",
            "sent_at": "2026-01-01T00:00:00+00:00",
            "is_edited": False,
            "media": [],
        },
    )


def test_send_message_works_with_no_notification_recorder_configured():
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.create_message.return_value = _message(topic_id=5)

    # No recorder passed -- must not raise, and must not even try to
    # resolve recipients since there's nothing to record them for.
    SendMessageUseCase(repository, notifier=Mock()).execute(
        sender_id=10, content="hello", topic_id=5
    )

    repository.list_target_member_ids.assert_not_called()


def test_delete_message_records_a_notification_after_the_delete_succeeds():
    repository = Mock()
    repository.get_message.return_value = _message(
        topic_id=5, sender_id=10, base_message_id=1
    )
    repository.list_target_member_ids.return_value = [11, 12]
    recorder = Mock()

    DeleteMessageUseCase(repository, notification_recorder=recorder).execute(
        base_message_id=1, user_id=10
    )

    repository.list_target_member_ids.assert_called_once_with(
        topic_id=5, group_id=None, direct_chat_id=None, user_id=10
    )
    recorder.record.assert_called_once_with(
        [11, 12], "MESSAGE_DELETED", {"base_message_id": 1}
    )


def test_delete_message_does_not_record_when_the_delete_is_forbidden():
    repository = Mock()
    repository.get_message.return_value = _message(
        topic_id=5, sender_id=10, group_id=None
    )
    repository.get_permissions_for_topic.return_value = []
    recorder = Mock()

    with pytest.raises(MessageDeleteForbiddenError):
        DeleteMessageUseCase(repository, notification_recorder=recorder).execute(
            base_message_id=1, user_id=999
        )

    recorder.record.assert_not_called()
