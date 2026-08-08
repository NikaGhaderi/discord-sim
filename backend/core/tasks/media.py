"""Generic thumbnail-generation Celery task.

Cross-app infrastructure per .cursorrules -- lives in core/tasks, not inside
any single app, since more than one app needs thumbnails (message media now,
avatar uploads later). Deliberately thin: real thumbnail generation has no
business logic to delegate to an application service, just an infrastructure
call.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="core.generate_thumbnail_task")
def generate_thumbnail_task(media_id: int) -> None:
    # TODO: generate a real thumbnail. This requires an image-processing
    # library (e.g. Pillow) that is not yet in requirements.txt -- adding a
    # new dependency is a bigger call than this task should make on its own,
    # so this is a deliberate, documented stub rather than a silent no-op.
    logger.info("Thumbnail generation requested for media_id=%s", media_id)
