from datetime import datetime, timezone

from apps.messaging.api.serializers import (
    MessageSerializer,
    MessageQuerySerializer,
    SendMessageSerializer,
)
from apps.messaging.domain.models import MessageDetailEntity


def test_create_serializer_accepts_exactly_one_target():
    serializer = SendMessageSerializer(
        data={
            "topic_id": 5,
            "group_id": None,
            "direct_chat_id": None,
            "content": "Hello",
        }
    )

    assert serializer.is_valid(), serializer.errors


def test_create_serializer_rejects_zero_targets():
    serializer = SendMessageSerializer(data={"content": "Hello"})

    assert not serializer.is_valid()
    assert "Exactly one" in str(serializer.errors)


def test_create_serializer_rejects_multiple_targets():
    serializer = SendMessageSerializer(
        data={"topic_id": 1, "group_id": 2, "content": "Hello"}
    )

    assert not serializer.is_valid()
    assert "Exactly one" in str(serializer.errors)


def test_query_serializer_enforces_pagination_bounds():
    serializer = MessageQuerySerializer(data={"group_id": 1, "limit": 101})

    assert not serializer.is_valid()
    assert "limit" in serializer.errors


def test_message_serializer_includes_empty_media_array():
    message = MessageDetailEntity(
        id=1,
        sender_id=2,
        topic_id=5,
        group_id=None,
        direct_chat_id=None,
        body="Hello",
        is_edited=False,
        created_at=datetime.now(timezone.utc),
    )

    assert MessageSerializer(message).data["media"] == []
