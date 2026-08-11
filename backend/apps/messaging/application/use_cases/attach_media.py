from typing import BinaryIO

from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import (
    InvalidMediaError,
    MediaAttachmentForbiddenError,
)
from apps.messaging.domain.models import MediaEntity, MessageEntity
from apps.permissions.domain.checker import has_permission
from apps.permissions.domain.permissions import PermissionCode
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

        message = self._repository.get_message(base_message_id)
        if not self._can_attach(message, user_id):
            raise MediaAttachmentForbiddenError(
                "You cannot attach media to this message."
            )

        media = self._repository.attach_media(
            base_message_id,
            uploaded_file,
            file_type,
            file_size,
        )
        if file_type.startswith("image/"):
            generate_thumbnail_task.delay(media.media_id)
        return media

    def _can_attach(self, message: MessageEntity, user_id: int) -> bool:
        target = {
            "topic_id": message.topic_id,
            "group_id": message.group_id,
            "direct_chat_id": message.direct_chat_id,
        }
        if not self._repository.can_access_target(user_id, **target):
            return False
        if message.topic_id is None:
            return True

        granted = self._repository.get_permissions_for_topic(
            message.topic_id,
            user_id,
        )
        return has_permission(granted, PermissionCode.SEND_MEDIA.value)
