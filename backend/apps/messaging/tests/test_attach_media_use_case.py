from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import Mock, patch

import pytest

from apps.messaging.application.use_cases.attach_media import AttachMediaUseCase
from apps.messaging.domain.exceptions import MediaAttachmentForbiddenError
from apps.messaging.domain.models import MediaEntity, MessageEntity


def _message(
    *,
    topic_id: int | None = None,
    group_id: int | None = None,
    direct_chat_id: int | None = None,
) -> MessageEntity:
    return MessageEntity(
        base_message_id=10,
        sender_id=1,
        content="message",
        sent_at=datetime.now(timezone.utc),
        is_edited=False,
        topic_id=topic_id,
        group_id=group_id,
        direct_chat_id=direct_chat_id,
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


def test_channel_attachment_requires_send_media_permission():
    repository = Mock()
    repository.get_message.return_value = _message(topic_id=5)
    repository.can_access_target.return_value = True
    repository.get_permissions_for_topic.return_value = []

    with pytest.raises(MediaAttachmentForbiddenError):
        _execute(repository)

    repository.attach_media.assert_not_called()


def test_channel_member_with_send_media_can_attach():
    repository = Mock()
    repository.get_message.return_value = _message(topic_id=5)
    repository.can_access_target.return_value = True
    repository.get_permissions_for_topic.return_value = ["SEND_MEDIA"]
    repository.attach_media.return_value = _media()

    result = _execute(repository)

    assert result is repository.attach_media.return_value


@pytest.mark.parametrize(
    "message",
    (_message(group_id=7), _message(direct_chat_id=9)),
)
def test_group_and_dm_participants_do_not_need_channel_permission(message):
    repository = Mock()
    repository.get_message.return_value = message
    repository.can_access_target.return_value = True
    repository.attach_media.return_value = _media()

    _execute(repository)

    repository.get_permissions_for_topic.assert_not_called()
    repository.attach_media.assert_called_once()


def test_non_participant_cannot_attach_to_group_message():
    repository = Mock()
    repository.get_message.return_value = _message(group_id=7)
    repository.can_access_target.return_value = False

    with pytest.raises(MediaAttachmentForbiddenError):
        _execute(repository)

    repository.attach_media.assert_not_called()


@patch("apps.messaging.application.use_cases.attach_media.generate_thumbnail_task")
def test_image_attachment_queues_thumbnail_generation(thumbnail_task):
    repository = Mock()
    repository.get_message.return_value = _message(direct_chat_id=9)
    repository.can_access_target.return_value = True
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
