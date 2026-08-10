from abc import ABC, abstractmethod

from apps.notifications.domain.models import NotificationEntity


class AbstractNotificationsRepository(ABC):
    @abstractmethod
    def list_for_user(self, user_id: int) -> list[NotificationEntity]: ...

    @abstractmethod
    def mark_read(
        self, notification_id: int, user_id: int, is_read: bool
    ) -> NotificationEntity:
        """Raises NotificationNotFoundError if the notification doesn't
        exist or doesn't belong to user_id -- the caller can't tell which."""
        ...
