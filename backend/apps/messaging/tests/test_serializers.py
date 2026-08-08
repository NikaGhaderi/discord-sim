from apps.messaging.api.serializers import (
    CreateMessageSerializer,
    MessageQuerySerializer,
)


def test_create_serializer_accepts_exactly_one_target():
    serializer = CreateMessageSerializer(
        data={
            "topic_id": 5,
            "group_id": None,
            "direct_chat_id": None,
            "content": "Hello",
        }
    )

    assert serializer.is_valid(), serializer.errors


def test_create_serializer_rejects_zero_targets():
    serializer = CreateMessageSerializer(data={"content": "Hello"})

    assert not serializer.is_valid()
    assert "Exactly one" in str(serializer.errors)


def test_create_serializer_rejects_multiple_targets():
    serializer = CreateMessageSerializer(
        data={"topic_id": 1, "group_id": 2, "content": "Hello"}
    )

    assert not serializer.is_valid()
    assert "Exactly one" in str(serializer.errors)


def test_query_serializer_enforces_pagination_bounds():
    serializer = MessageQuerySerializer(data={"group_id": 1, "limit": 101})

    assert not serializer.is_valid()
    assert "limit" in serializer.errors
