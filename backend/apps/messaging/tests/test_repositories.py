from unittest.mock import patch

import pytest

from apps.authentication.models import User
from apps.messaging.models import Message, MessageHistory
from apps.messaging.repositories import DjangoMessagingRepository
from apps.private_spaces.models import DirectChat


@pytest.mark.django_db(transaction=True)
def test_failed_history_insert_rolls_back_message_edit():
    sender = User.objects.create_user(
        username="transaction-sender",
        email="transaction-sender@example.com",
    )
    other = User.objects.create_user(
        username="transaction-other",
        email="transaction-other@example.com",
    )
    direct_chat = DirectChat.objects.create(user1=sender, user2=other)
    message = Message.objects.create(
        sender=sender,
        direct_chat=direct_chat,
        body="original",
    )

    with (
        patch.object(
            MessageHistory.objects,
            "create",
            side_effect=RuntimeError("audit storage failed"),
        ),
        pytest.raises(RuntimeError, match="audit storage failed"),
    ):
        DjangoMessagingRepository().write_message_edit(message.id, "must roll back")

    message.refresh_from_db()
    assert message.body == "original"
    assert message.is_edited is False
    assert MessageHistory.objects.count() == 0
