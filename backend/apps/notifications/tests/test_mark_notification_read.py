from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from apps.notifications.application.use_cases.mark_notification_read import (
    MarkNotificationReadUseCase,
)
from apps.notifications.domain.exceptions import NotificationNotFoundError
from apps.notifications.domain.models import NotificationEntity


def test_mark_notification_read_delegates_to_the_repository():
    repository = Mock()
    repository.mark_read.return_value = NotificationEntity(
        notification_id=1,
        event_type="NEW_MESSAGE",
        payload={"base_message_id": 1},
        is_read=True,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )

    result = MarkNotificationReadUseCase(repository).execute(
        notification_id=1, user_id=42, is_read=True
    )

    repository.mark_read.assert_called_once_with(1, 42, True)
    assert result.is_read is True


def test_mark_notification_read_propagates_not_found():
    repository = Mock()
    repository.mark_read.side_effect = NotificationNotFoundError("Notification not found.")

    with pytest.raises(NotificationNotFoundError):
        MarkNotificationReadUseCase(repository).execute(
            notification_id=999, user_id=42, is_read=True
        )
