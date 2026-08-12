from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.models import MessageEntity


class PromoteScheduledMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(self, scheduled_message_id: int) -> MessageEntity | None:
        return self._repository.promote_scheduled_message(scheduled_message_id)
