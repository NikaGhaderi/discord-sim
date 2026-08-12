from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import ScheduledMessageCancelForbiddenError


class CancelScheduledMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(self, scheduled_message_id: int, user_id: int) -> None:
        scheduled = self._repository.get_scheduled_message(scheduled_message_id)
        if scheduled.sender_id != user_id:
            raise ScheduledMessageCancelForbiddenError(
                "Only the sender can cancel this scheduled message."
            )
        self._repository.delete_scheduled_message(scheduled_message_id)
