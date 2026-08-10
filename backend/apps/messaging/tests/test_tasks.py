import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
import pytest

from apps.authentication.models import User
from apps.messaging.models import Media, Message
from apps.workspaces.models import Channel, Topic
from core.tasks.media import generate_thumbnail_task


def _make_uploaded_image(name="photo.jpg", size=(10, 10), color="red"):
    buffer = io.BytesIO()
    with Image.new("RGB", size, color=color) as image:
        image.save(buffer, format="JPEG")
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type="image/jpeg")


@pytest.fixture
def media_row(db, tmp_path):
    sender = User.objects.create_user(
        username="thumb-user",
        email="thumb-user@example.com",
    )
    with override_settings(MEDIA_ROOT=tmp_path):
        channel = Channel.objects.create(name="thumb-channel", creator=sender)
        topic = Topic.objects.create(title="thumb-topic", channel=channel)
        message = Message.objects.create(
            sender=sender,
            topic=topic,
            content="attachment",
        )
        media = Media.objects.create(
            base_message=message,
            file=_make_uploaded_image(),
            file_type="image/jpeg",
            file_size=1024,
        )
        yield media


@pytest.mark.django_db
def test_generate_thumbnail_task_creates_bounded_thumbnail(media_row, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        generate_thumbnail_task(media_row.id)

        media_row.refresh_from_db()
        assert media_row.thumbnail
        assert media_row.thumbnail.name

        with Image.open(media_row.thumbnail.path) as thumbnail_image:
            width, height = thumbnail_image.size
            assert width <= 256
            assert height <= 256


@pytest.mark.django_db
def test_generate_thumbnail_task_missing_media_does_not_raise(db, tmp_path):
    with override_settings(MEDIA_ROOT=tmp_path):
        generate_thumbnail_task(999999)
