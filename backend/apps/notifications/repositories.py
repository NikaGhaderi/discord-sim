from apps.notifications.application.interfaces import AbstractNotificationsRepository
from apps.notifications.domain.models import NotificationEntity
from apps.notifications.models import Notification


def _to_entity(n: Notification) -> NotificationEntity:
    return NotificationEntity(
        notification_id=n.id,
        event_type=n.event_type,
        payload=n.payload,
        is_read=n.is_read,
        created_at=n.created_at,
    )


class DjangoNotificationsRepository(AbstractNotificationsRepository):
    def list_for_user(self, user_id: int) -> list[NotificationEntity]:
        notifications = Notification.objects.filter(recipient_id=user_id).order_by(
            "-created_at"
        )
        return [_to_entity(n) for n in notifications]