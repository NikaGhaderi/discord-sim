import pytest
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.notifications.models import Notification
from apps.workspaces.models import Channel, ChannelMember, Topic


@pytest.fixture
def users(db):
    return [
        User.objects.create_user(
            username=f"notif-user-{index}",
            email=f"notif-user-{index}@example.com",
        )
        for index in range(1, 3)
    ]


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_list_notifications_requires_authentication():
    response = APIClient().get("/api/notifications/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_a_user_only_ever_sees_their_own_notifications(users):
    owner, other = users
    Notification.objects.create(
        recipient=owner, event_type="NEW_MESSAGE", payload={"base_message_id": 1}
    )
    Notification.objects.create(
        recipient=other, event_type="NEW_MESSAGE", payload={"base_message_id": 2}
    )

    response = client_for(owner).get("/api/notifications/")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["payload"] == {"base_message_id": 1}


@pytest.mark.django_db
def test_query_params_cannot_be_used_to_see_another_users_notifications(users):
    owner, other = users
    Notification.objects.create(
        recipient=other, event_type="NEW_MESSAGE", payload={"base_message_id": 2}
    )

    response = client_for(owner).get(f"/api/notifications/?user_id={other.id}")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_response_shape_matches_the_notification_contract(users):
    owner, _other = users
    notification = Notification.objects.create(
        recipient=owner,
        event_type="MESSAGE_DELETED",
        payload={"base_message_id": 7},
    )

    response = client_for(owner).get("/api/notifications/")

    assert response.status_code == 200
    assert response.json() == [
        {
            "notification_id": notification.id,
            "event_type": "MESSAGE_DELETED",
            "payload": {"base_message_id": 7},
            "is_read": False,
            "created_at": notification.created_at.isoformat().replace("+00:00", "Z"),
        }
    ]


@pytest.mark.django_db
def test_newest_notifications_come_first(users):
    owner, _other = users
    first = Notification.objects.create(
        recipient=owner, event_type="NEW_MESSAGE", payload={"base_message_id": 1}
    )
    second = Notification.objects.create(
        recipient=owner, event_type="NEW_MESSAGE", payload={"base_message_id": 2}
    )

    response = client_for(owner).get("/api/notifications/")

    ids = [item["notification_id"] for item in response.json()]
    assert ids == [second.id, first.id]


@pytest.mark.django_db
def test_sending_a_message_creates_a_retrievable_notification_for_the_other_member(
    users,
):
    sender, member = users
    channel = Channel.objects.create(name="Channel", creator=sender)
    topic = Topic.objects.create(title="Topic", channel=channel)
    ChannelMember.objects.create(channel=channel, user=sender)
    ChannelMember.objects.create(channel=channel, user=member)

    send_response = client_for(sender).post(
        "/api/messages/",
        {
            "topic_id": topic.id,
            "group_id": None,
            "direct_chat_id": None,
            "content": "hello from the notification integration test",
        },
        format="json",
    )
    assert send_response.status_code == 201
    message_id = send_response.json()["base_message_id"]

    member_notifications = client_for(member).get("/api/notifications/").json()
    sender_notifications = client_for(sender).get("/api/notifications/").json()

    assert len(member_notifications) == 1
    assert member_notifications[0]["event_type"] == "NEW_MESSAGE"
    assert member_notifications[0]["payload"]["base_message_id"] == message_id
    # The sender doesn't get notified of their own message.
    assert sender_notifications == []


@pytest.mark.django_db
def test_mark_notification_read_requires_authentication():
    response = APIClient().patch(
        "/api/notifications/1/", {"is_read": True}, format="json"
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_owner_can_mark_their_own_notification_read(users):
    owner, _other = users
    notification = Notification.objects.create(
        recipient=owner, event_type="NEW_MESSAGE", payload={"base_message_id": 1}
    )

    response = client_for(owner).patch(
        f"/api/notifications/{notification.id}/", {"is_read": True}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["is_read"] is True
    notification.refresh_from_db()
    assert notification.is_read is True


@pytest.mark.django_db
def test_marking_read_can_be_reversed_to_unread(users):
    owner, _other = users
    notification = Notification.objects.create(
        recipient=owner,
        event_type="NEW_MESSAGE",
        payload={"base_message_id": 1},
        is_read=True,
    )

    response = client_for(owner).patch(
        f"/api/notifications/{notification.id}/", {"is_read": False}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["is_read"] is False


@pytest.mark.django_db
def test_marking_a_nonexistent_notification_read_returns_404(users):
    owner, _other = users

    response = client_for(owner).patch(
        "/api/notifications/999999/", {"is_read": True}, format="json"
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_a_user_cannot_mark_someone_elses_notification_read(users):
    owner, other = users
    notification = Notification.objects.create(
        recipient=other, event_type="NEW_MESSAGE", payload={"base_message_id": 1}
    )

    response = client_for(owner).patch(
        f"/api/notifications/{notification.id}/", {"is_read": True}, format="json"
    )

    assert response.status_code == 404
    notification.refresh_from_db()
    assert notification.is_read is False


@pytest.mark.django_db
def test_mark_read_without_an_is_read_field_is_a_validation_error(users):
    owner, _other = users
    notification = Notification.objects.create(
        recipient=owner, event_type="NEW_MESSAGE", payload={"base_message_id": 1}
    )

    response = client_for(owner).patch(
        f"/api/notifications/{notification.id}/", {}, format="json"
    )

    assert response.status_code == 400
