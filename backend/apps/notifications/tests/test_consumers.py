from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User
from config.asgi import application


def _access_token_for(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


@pytest.mark.django_db(transaction=True)
def test_connect_is_rejected_without_a_token():
    async def scenario():
        communicator = WebsocketCommunicator(application, "/ws/stream/")
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
def test_connect_is_rejected_with_an_invalid_token():
    async def scenario():
        communicator = WebsocketCommunicator(
            application, "/ws/stream/?token=not-a-real-token"
        )
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
def test_connect_succeeds_with_a_valid_token():
    user = User.objects.create_user(username="ws-user", email="ws-user@example.com")
    token = _access_token_for(user)

    async def scenario():
        communicator = WebsocketCommunicator(application, f"/ws/stream/?token={token}")
        connected, _ = await communicator.connect()
        assert connected is True
        await communicator.disconnect()

    async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
def test_subscribed_client_receives_a_group_broadcast():
    user = User.objects.create_user(
        username="ws-subscriber", email="ws-subscriber@example.com"
    )
    token = _access_token_for(user)

    async def scenario():
        communicator = WebsocketCommunicator(application, f"/ws/stream/?token={token}")
        connected, _ = await communicator.connect()
        assert connected is True

        await communicator.send_json_to(
            {"action": "subscribe", "group": "test-group-a"}
        )

        layer = get_channel_layer()
        await layer.group_send(
            "test-group-a",
            {
                "type": "broadcast.event",
                "event_type": "NEW_MESSAGE",
                "payload": {"base_message_id": 1, "content": "hi"},
            },
        )

        response = await communicator.receive_json_from(timeout=5)
        assert response == {
            "event_type": "NEW_MESSAGE",
            "data": {"base_message_id": 1, "content": "hi"},
        }

        await communicator.disconnect()

    async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
def test_client_does_not_receive_broadcasts_for_groups_it_never_subscribed_to():
    user = User.objects.create_user(
        username="ws-unsubscribed", email="ws-unsubscribed@example.com"
    )
    token = _access_token_for(user)

    async def scenario():
        communicator = WebsocketCommunicator(application, f"/ws/stream/?token={token}")
        connected, _ = await communicator.connect()
        assert connected is True
        # Deliberately never subscribes to anything.

        layer = get_channel_layer()
        await layer.group_send(
            "test-group-a",
            {
                "type": "broadcast.event",
                "event_type": "NEW_MESSAGE",
                "payload": {"base_message_id": 1, "content": "hi"},
            },
        )

        assert await communicator.receive_nothing(timeout=1)
        await communicator.disconnect()

    async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
def test_disconnect_stops_further_delivery_to_that_socket():
    user = User.objects.create_user(
        username="ws-disconnecter", email="ws-disconnecter@example.com"
    )
    token = _access_token_for(user)

    async def scenario():
        communicator = WebsocketCommunicator(application, f"/ws/stream/?token={token}")
        connected, _ = await communicator.connect()
        assert connected is True
        await communicator.send_json_to(
            {"action": "subscribe", "group": "test-group-b"}
        )
        await communicator.disconnect()

        layer = get_channel_layer()
        # Should not raise even though the only subscriber just disconnected
        # and was removed from the group.
        await layer.group_send(
            "test-group-b",
            {"type": "broadcast.event", "event_type": "NEW_MESSAGE", "payload": {}},
        )

    async_to_sync(scenario)()
