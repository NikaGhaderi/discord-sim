import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.authentication.models import User
from apps.messaging.domain.exceptions import InvalidMessageTargetError
from apps.messaging.domain.models import MessageEntity
from apps.messaging.models import (
    BaseMessage,
    Media,
    Message,
    MessageHistory,
    ScheduledMessage,
)
from apps.private_spaces.models import DirectChat, Group, GroupMember


def _message_entity(**overrides):
    values = {
        "id": 1,
        "sender_id": 2,
        "topic_id": 3,
        "group_id": None,
        "direct_chat_id": None,
        "body": "hello",
        "is_edited": False,
        "created_at": timezone.now(),
    }
    values.update(overrides)
    return MessageEntity(**values)


def test_domain_entity_requires_exactly_one_target():
    assert _message_entity().topic_id == 3

    with pytest.raises(InvalidMessageTargetError):
        _message_entity(topic_id=None)
    with pytest.raises(InvalidMessageTargetError):
        _message_entity(group_id=4)


@pytest.fixture
def users(db):
    return [
        User.objects.create_user(
            username=f"messaging-user-{index}",
            email=f"messaging-{index}@example.com",
        )
        for index in range(1, 4)
    ]


@pytest.mark.django_db
def test_model_validation_requires_exactly_one_target(users):
    first, second = users[:2]
    direct_chat = DirectChat.objects.create(user1=first, user2=second)

    with pytest.raises(ValidationError):
        Message(sender=first, body="none").full_clean()
    with pytest.raises(ValidationError):
        Message(
            sender=first,
            body="two",
            group=Group.objects.create(name="Group", creator=first),
            direct_chat=direct_chat,
        ).full_clean()


@pytest.mark.django_db
def test_database_constraint_requires_exactly_one_target(users):
    with pytest.raises(IntegrityError), transaction.atomic():
        Message.objects.create(sender=users[0], body="invalid")

    direct_chat = DirectChat.objects.create(user1=users[0], user2=users[1])
    group = Group.objects.create(name="Group", creator=users[0])
    with pytest.raises(IntegrityError), transaction.atomic():
        Message.objects.create(
            sender=users[0],
            body="also invalid",
            direct_chat=direct_chat,
            group=group,
        )


@pytest.mark.django_db
def test_scheduled_message_shares_base_message_target_constraint(users):
    scheduled = ScheduledMessage.objects.create(
        sender=users[0],
        body="reminder: standup",
        group=Group.objects.create(name="Group", creator=users[0]),
        scheduled_time=timezone.now(),
    )

    assert BaseMessage.objects.filter(pk=scheduled.pk).exists()
    with pytest.raises(IntegrityError), transaction.atomic():
        ScheduledMessage.objects.create(
            sender=users[0],
            body="invalid",
            scheduled_time=timezone.now(),
        )


@pytest.mark.django_db
def test_deleting_private_space_cascades_to_messages(users):
    first, second = users[:2]
    group = Group.objects.create(name="Group", creator=first)
    GroupMember.objects.create(group=group, user=first, is_admin=True)
    Message.objects.create(sender=first, group=group, body="gone")

    group.delete()

    assert Message.objects.count() == 0
    assert BaseMessage.objects.count() == 0


@pytest.mark.django_db
def test_deleting_direct_chat_cascades_message_media_and_history(users):
    first, second = users[:2]
    direct_chat = DirectChat.objects.create(user1=first, user2=second)
    message = Message.objects.create(
        sender=first,
        direct_chat=direct_chat,
        body="gone",
    )
    Media.objects.create(
        message=message,
        file="message_media/gone.txt",
        content_type="text/plain",
        file_size=4,
    )
    MessageHistory.objects.create(message=message, previous_body="older")

    direct_chat.delete()

    assert Message.objects.count() == 0
    assert BaseMessage.objects.count() == 0
    assert Media.objects.count() == 0
    assert MessageHistory.objects.count() == 0
