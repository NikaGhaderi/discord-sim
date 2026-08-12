from datetime import datetime, timezone

from apps.messaging.application.interfaces import (
    AbstractMessagingRepository,
    AbstractScheduledMessageDispatcher,
)
from apps.messaging.application.use_cases.messages import validate_exactly_one_target
from apps.messaging.domain.exceptions import (
    InvalidScheduledTimeError,
    MessageTargetNotFoundError,
)
from apps.messaging.domain.models import ScheduledMessageEntity


class CreateScheduledMessageUseCase:
    def __init__(
        self,
        repository: AbstractMessagingRepository,
        dispatcher: AbstractScheduledMessageDispatcher | None = None,
    ) -> None:
        self._repository = repository
        self._dispatcher = dispatcher

    def execute(
        self,
        sender_id: int,
        content: str,
        scheduled_time: datetime,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
    ) -> ScheduledMessageEntity:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if (
            scheduled_time.tzinfo is None
            or scheduled_time.utcoffset() is None
            or scheduled_time <= datetime.now(timezone.utc)
        ):
            raise InvalidScheduledTimeError("scheduled_time must be in the future.")
        if not self._repository.can_access_target(
            sender_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")

        scheduled = self._repository.create_scheduled_message(
            sender_id,
            content,
            scheduled_time,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        )
        if self._dispatcher is not None:
            self._dispatcher.schedule(
                scheduled.scheduled_id,
                scheduled.scheduled_time,
            )
        return scheduled
