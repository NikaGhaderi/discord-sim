from datetime import datetime, timezone
from unittest.mock import Mock

from apps.notifications.application.use_cases.list_notifications import (
    ListNotificationsUseCase,
)
from apps.notifications.domain.models import NotificationEntity


def _notification(**overrides) -> NotificationEntity:
    defaults = dict(
        notification_id=1,
        event_type="NEW_MESSAGE",
        payload={"base_message_id": 1},
        is_read=False,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    defaults.update(overrides)
    return NotificationEntity(**defaults)


def test_list_notifications_delegates_to_the_repository_for_the_requesting_user():
    repository = Mock()
    repository.list_for_user.return_value = [_notification()]

    result = ListNotificationsUseCase(repository).execute(user_id=42)

    repository.list_for_user.assert_called_once_with(42)
    assert result == [_notification()]
