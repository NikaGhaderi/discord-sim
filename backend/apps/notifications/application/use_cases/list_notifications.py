from apps.notifications.application.interfaces import AbstractNotificationsRepository
from apps.notifications.domain.models import NotificationEntity


class ListNotificationsUseCase:
    def __init__(self, repository: AbstractNotificationsRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int) -> list[NotificationEntity]:
        return self._repository.list_for_user(user_id)
