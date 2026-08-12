from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import MessageEditForbiddenError
from apps.messaging.domain.models import MessageEntity


class EditMessageUseCase:
    """Edit a message through the repository's atomic history/update operation."""

    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        base_message_id: int,
        user_id: int,
        content: str,
    ) -> MessageEntity:
        message = self._repository.get_message(base_message_id)
        if message.sender_id != user_id:
            raise MessageEditForbiddenError("Only the sender can edit this message.")
        return self._repository.write_message_edit(base_message_id, content)
