from unittest.mock import patch

import pytest

from apps.authentication.models import User
from apps.notifications.models import Notification
from apps.notifications.recorder import DjangoNotificationRecorder


@pytest.mark.django_db
def test_record_persists_a_notification_per_recipient():
    owner = User.objects.create_user(username="owner", email="owner@example.com")
    other = User.objects.create_user(username="other", email="other@example.com")

    DjangoNotificationRecorder().record(
        [owner.id, other.id], "NEW_MESSAGE", {"base_message_id": 1}
    )

    assert Notification.objects.filter(recipient=owner).count() == 1
    assert Notification.objects.filter(recipient=other).count() == 1


@pytest.mark.django_db
def test_record_also_pushes_a_live_new_notification_event_per_recipient():
    owner = User.objects.create_user(username="owner2", email="owner2@example.com")

    with patch("apps.notifications.recorder.ChannelsRealtimeNotifier") as MockNotifier:
        DjangoNotificationRecorder().record(
            [owner.id], "NEW_MESSAGE", {"base_message_id": 1}
        )

        instance = MockNotifier.return_value
        instance.notify.assert_called_once()
        group_name, event_type, payload = instance.notify.call_args.args
        assert group_name == f"user_{owner.id}"
        assert event_type == "NEW_NOTIFICATION"
        assert payload["event_type"] == "NEW_MESSAGE"
        assert payload["payload"] == {"base_message_id": 1}
        assert payload["is_read"] is False
