from apps.messaging.application.interfaces import AbstractNotificationRecorder
from apps.messaging.realtime import ChannelsRealtimeNotifier
from apps.notifications.models import Notification


class DjangoNotificationRecorder(AbstractNotificationRecorder):
    def record(self, recipient_ids: list[int], event_type: str, payload: dict) -> None:
        created = Notification.objects.bulk_create(
            Notification(recipient_id=uid, event_type=event_type, payload=payload)
            for uid in recipient_ids
        )
        # Persisting alone doesn't reach an already-open bell -- push each
        # notification live to its recipient's personal group too (see
        # NotificationConsumer.connect's auto-join), same payload shape the
        # /api/notifications/ list endpoint returns.
        notifier = ChannelsRealtimeNotifier()
        for notification in created:
            notifier.notify(
                f"user_{notification.recipient_id}",
                "NEW_NOTIFICATION",
                {
                    "notification_id": notification.id,
                    "event_type": notification.event_type,
                    "payload": notification.payload,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat().replace(
                        "+00:00", "Z"
                    )
                    if notification.created_at
                    else None,
                },
            )
