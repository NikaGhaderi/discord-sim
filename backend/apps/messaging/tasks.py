from datetime import datetime

from celery import shared_task

from apps.messaging.application.interfaces import AbstractScheduledMessageDispatcher
from apps.messaging.application.use_cases.promote_scheduled_message import (
    PromoteScheduledMessageUseCase,
)
from apps.messaging.repositories import DjangoMessagingRepository


@shared_task(name="messaging.promote_scheduled_message")
def promote_scheduled_message(scheduled_message_id: int) -> int | None:
    message = PromoteScheduledMessageUseCase(DjangoMessagingRepository()).execute(
        scheduled_message_id
    )
    return message.base_message_id if message is not None else None


class CeleryScheduledMessageDispatcher(AbstractScheduledMessageDispatcher):
    def schedule(self, scheduled_message_id: int, eta: datetime) -> None:
        promote_scheduled_message.apply_async(args=(scheduled_message_id,), eta=eta)
