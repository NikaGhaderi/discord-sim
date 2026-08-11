from apps.notifications.application.interfaces import AbstractNotificationsRepository
from apps.notifications.domain.models import NotificationEntity


class MarkNotificationReadUseCase:
    def __init__(self, repository: AbstractNotificationsRepository) -> None:
        self._repository = repository

    def execute(
        self, notification_id: int, user_id: int, is_read: bool
    ) -> NotificationEntity:
        return self._repository.mark_read(notification_id, user_id, is_read)
