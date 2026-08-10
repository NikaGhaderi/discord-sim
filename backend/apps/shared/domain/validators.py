"""Framework-independent file-upload validation shared across apps.

Both message-attachment uploads (apps.messaging) and avatar uploads
(apps.users, future ticket) need the same size/content-type checks, so the
policy is centralized here instead of being duplicated per app.
"""

from apps.shared.domain.exceptions import InvalidFileError

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
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


def validate_file(file_size: int, content_type: str) -> None:
    if file_size <= 0 or file_size > MAX_FILE_SIZE_BYTES:
        raise InvalidFileError("File size must be between 1 byte and 25 MiB.")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidFileError("This file type is not allowed.")
