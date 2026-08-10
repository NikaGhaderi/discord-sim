from typing import BinaryIO

from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import (
    InvalidMediaError,
    MediaAttachmentForbiddenError,
)
from apps.messaging.domain.models import MediaEntity
from apps.shared.domain.exceptions import InvalidFileError
from apps.shared.domain.validators import validate_file
from core.tasks.media import generate_thumbnail_task


class AttachMediaUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        base_message_id: int,
        user_id: int,
        uploaded_file: BinaryIO,
        file_type: str,
        file_size: int,
    ) -> MediaEntity:
        try:
            validate_file(file_size, file_type)
        except InvalidFileError as exc:
            raise InvalidMediaError(str(exc)) from exc
        if not self._repository.can_attach_media(base_message_id, user_id):
            raise MediaAttachmentForbiddenError(
                "You cannot attach media to this message."
            )
        media_entity = self._repository.attach_media(
            base_message_id,
            uploaded_file,
            file_type,
            file_size,
        )
        if file_type.startswith("image/"):
            generate_thumbnail_task.delay(media_entity.media_id)
        return media_entity
