from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import Mock, patch

import pytest

from apps.messaging.application.use_cases.attach_media import AttachMediaUseCase
from apps.messaging.domain.exceptions import MediaAttachmentForbiddenError
from apps.messaging.domain.models import MediaEntity, MessageEntity


def _message(
    *,
    sender_id: int = 2,
    topic_id: int | None = None,
    group_id: int | None = None,
    direct_chat_id: int | None = None,
) -> MessageEntity:
    return MessageEntity(
        id=10,
        sender_id=sender_id,
        topic_id=topic_id,
        group_id=group_id,
        direct_chat_id=direct_chat_id,
        body="message",
        is_edited=False,
        created_at=datetime.now(timezone.utc),
    )


def _media() -> MediaEntity:
    return MediaEntity(
        media_id=20,
        base_message_id=10,
        file_url="/media/document.txt",
        file_type="text/plain",
        file_size=8,
    )


def _execute(repository: Mock):
    return AttachMediaUseCase(repository).execute(
        base_message_id=10,
        user_id=2,
        uploaded_file=BytesIO(b"document"),
        file_type="text/plain",
        file_size=8,
    )


def test_sender_without_send_media_permission_cannot_attach_in_channel():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=2, topic_id=5)
    repository.get_permissions_for_topic.return_value = []

    with pytest.raises(MediaAttachmentForbiddenError):
        _execute(repository)

    repository.attach_media.assert_not_called()


def test_sender_with_send_media_permission_can_attach_in_channel():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=2, topic_id=5)
    repository.get_permissions_for_topic.return_value = ["SEND_MEDIA"]
    repository.attach_media.return_value = _media()

    result = _execute(repository)

    assert result is repository.attach_media.return_value


def test_non_sender_cannot_attach_in_channel_even_with_send_media_permission():
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=1, topic_id=5)
    repository.get_permissions_for_topic.return_value = ["SEND_MEDIA"]

    with pytest.raises(MediaAttachmentForbiddenError):
        _execute(repository)

    repository.attach_media.assert_not_called()


@pytest.mark.parametrize(
    "message",
    (_message(sender_id=2, group_id=7), _message(sender_id=2, direct_chat_id=9)),
)
def test_sender_can_attach_in_group_or_dm_without_channel_permission_check(message):
    repository = Mock()
    repository.get_message.return_value = message
    repository.attach_media.return_value = _media()

    _execute(repository)

    repository.get_permissions_for_topic.assert_not_called()
    repository.attach_media.assert_called_once()


@pytest.mark.parametrize(
    "message",
    (_message(sender_id=1, group_id=7), _message(sender_id=1, direct_chat_id=9)),
)
def test_non_sender_cannot_attach_in_group_or_dm(message):
    repository = Mock()
    repository.get_message.return_value = message

    with pytest.raises(MediaAttachmentForbiddenError):
        _execute(repository)

    repository.attach_media.assert_not_called()


@patch("apps.messaging.application.use_cases.attach_media.generate_thumbnail_task")
def test_image_attachment_queues_thumbnail_generation(thumbnail_task):
    repository = Mock()
    repository.get_message.return_value = _message(sender_id=2, direct_chat_id=9)
    media = _media()
    media.file_type = "image/png"
    repository.attach_media.return_value = media

    AttachMediaUseCase(repository).execute(
        base_message_id=10,
        user_id=2,
        uploaded_file=BytesIO(b"image"),
        file_type="image/png",
        file_size=5,
    )

    thumbnail_task.delay.assert_called_once_with(20)
