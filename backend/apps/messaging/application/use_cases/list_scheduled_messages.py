from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.models import ScheduledMessageEntity


class ListScheduledMessagesUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        sender_id: int,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
    ) -> list[ScheduledMessageEntity]:
        return self._repository.list_scheduled_messages(
            sender_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        )
