from apps.messaging.application.interfaces import AbstractNotificationRecorder
from apps.notifications.models import Notification


class DjangoNotificationRecorder(AbstractNotificationRecorder):
    def record(self, recipient_ids: list[int], event_type: str, payload: dict) -> None:
        Notification.objects.bulk_create(
            Notification(recipient_id=uid, event_type=event_type, payload=payload)
            for uid in recipient_ids
        )
