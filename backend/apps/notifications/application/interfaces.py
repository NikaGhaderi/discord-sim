from abc import ABC, abstractmethod

from apps.notifications.domain.models import NotificationEntity


class AbstractNotificationsRepository(ABC):
    @abstractmethod
    def list_for_user(self, user_id: int) -> list[NotificationEntity]: ...
