from typing import BinaryIO

from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import (
    InvalidMediaError,
    MediaAttachmentForbiddenError,
)
from apps.messaging.domain.models import MediaEntity


MAX_MEDIA_FILE_SIZE = 25 * 1024 * 1024
ALLOWED_MEDIA_TYPES = {
    "application/pdf",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
    "video/mp4",
    "video/webm",
}


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
        if file_size <= 0 or file_size > MAX_MEDIA_FILE_SIZE:
            raise InvalidMediaError("File size must be between 1 byte and 25 MiB.")
        if file_type not in ALLOWED_MEDIA_TYPES:
            raise InvalidMediaError("This file type is not allowed.")
        if not self._repository.can_attach_media(base_message_id, user_id):
            raise MediaAttachmentForbiddenError(
                "You cannot attach media to this message."
            )
        return self._repository.attach_media(
            base_message_id,
            uploaded_file,
            file_type,
            file_size,
        )
