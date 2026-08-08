import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.authentication.models import User
from apps.messaging.models import BaseMessage, Media, Message, MessageHistory
from apps.private_spaces.models import DirectChat, Group, GroupMember


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
        BaseMessage(sender=first, content="none").full_clean()
    with pytest.raises(ValidationError):
        BaseMessage(
            sender=first,
            content="two",
            group=Group.objects.create(name="Group", creator=first),
            direct_chat=direct_chat,
        ).full_clean()


@pytest.mark.django_db
def test_database_constraint_requires_exactly_one_target(users):
    with pytest.raises(IntegrityError), transaction.atomic():
        Message.objects.create(sender=users[0], content="invalid")

    direct_chat = DirectChat.objects.create(user1=users[0], user2=users[1])
    group = Group.objects.create(name="Group", creator=users[0])
    with pytest.raises(IntegrityError), transaction.atomic():
        Message.objects.create(
            sender=users[0],
            content="also invalid",
            direct_chat=direct_chat,
            group=group,
        )


@pytest.mark.django_db
def test_deleting_private_space_cascades_to_messages(users):
    first, second = users[:2]
    group = Group.objects.create(name="Group", creator=first)
    GroupMember.objects.create(group=group, user=first, is_admin=True)
    Message.objects.create(sender=first, group=group, content="gone")

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
        content="gone",
    )
    Media.objects.create(
        base_message=message,
        file="message_media/gone.txt",
        file_type="text/plain",
        file_size=4,
    )
    MessageHistory.objects.create(base_message=message, old_content="older")

    direct_chat.delete()

    assert Message.objects.count() == 0
    assert BaseMessage.objects.count() == 0
    assert Media.objects.count() == 0
    assert MessageHistory.objects.count() == 0
