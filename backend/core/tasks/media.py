"""Thumbnail-generation Celery task.

Cross-app infrastructure per .cursorrules -- lives in core/tasks, not inside
any single app, since more than one app needs thumbnails (message media now,
avatar uploads later). This task is intentionally messaging-specific for now
(it imports apps.messaging.models.Media directly): if avatar thumbnails are
ever needed, that either gets a sibling task or this gets generalized then,
not speculatively now.
"""

from __future__ import annotations

import io
import logging

from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image

logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (256, 256)


@shared_task(name="core.generate_thumbnail_task")
def generate_thumbnail_task(media_id: int) -> None:
    from apps.messaging.models import Media

    media = Media.objects.filter(pk=media_id).first()
    if media is None:
        logger.warning(
            "Skipping thumbnail generation: media_id=%s no longer exists.",
            media_id,
        )
        return

    with Image.open(media.file) as image:
        image.thumbnail(THUMBNAIL_SIZE)
        if image.mode != "RGB":
            image = image.convert("RGB")
        with io.BytesIO() as buffer:
            image.save(buffer, format="JPEG")
            media.thumbnail.save(
                f"thumb_{media_id}.jpg",
                ContentFile(buffer.getvalue()),
                save=False,
            )

    media.save(update_fields=["thumbnail"])
