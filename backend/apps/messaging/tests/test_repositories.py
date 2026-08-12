from unittest.mock import patch

import pytest

from apps.authentication.models import User
from apps.messaging.models import Media, Message, MessageHistory
from apps.messaging.repositories import DjangoMessagingRepository
from apps.private_spaces.models import DirectChat, Group, GroupMember
from apps.workspaces.models import Channel, ChannelMember, Topic


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


@pytest.mark.django_db(transaction=True)
def test_failed_message_update_rolls_back_history_insert():
    sender = User.objects.create_user(
        username="second-write-sender",
        email="second-write-sender@example.com",
    )
    other = User.objects.create_user(
        username="second-write-other",
        email="second-write-other@example.com",
    )
    direct_chat = DirectChat.objects.create(user1=sender, user2=other)
    message = Message.objects.create(
        sender=sender,
        direct_chat=direct_chat,
        body="original",
    )

    with (
        patch.object(
            Message,
            "save",
            side_effect=RuntimeError("message update failed"),
        ),
        pytest.raises(RuntimeError, match="message update failed"),
    ):
        DjangoMessagingRepository().write_message_edit(message.id, "must roll back")

    message.refresh_from_db()
    assert message.body == "original"
    assert message.is_edited is False
    assert MessageHistory.objects.count() == 0


@pytest.mark.django_db
def test_hard_delete_cascades_to_history_and_media():
    sender = User.objects.create_user(
        username="cascade-sender",
        email="cascade-sender@example.com",
    )
    other = User.objects.create_user(
        username="cascade-other",
        email="cascade-other@example.com",
    )
    direct_chat = DirectChat.objects.create(user1=sender, user2=other)
    message = Message.objects.create(
        sender=sender,
        direct_chat=direct_chat,
        body="delete me",
    )
    MessageHistory.objects.create(message=message, previous_body="older body")
    Media.objects.create(
        message=message,
        file="message_media/cascade.txt",
        content_type="text/plain",
        file_size=10,
    )

    DjangoMessagingRepository().delete_message(message.id)

    assert not Message.objects.filter(pk=message.id).exists()
    assert MessageHistory.objects.count() == 0
    assert Media.objects.count() == 0


@pytest.fixture
def three_users(db):
    return [
        User.objects.create_user(
            username=f"recipient-{i}", email=f"recipient-{i}@example.com"
        )
        for i in range(3)
    ]


@pytest.mark.django_db
def test_list_target_member_ids_for_a_topic_excludes_the_caller(three_users):
    sender, member, outsider = three_users
    channel = Channel.objects.create(name="Channel", creator=sender)
    topic = Topic.objects.create(title="Topic", channel=channel)
    ChannelMember.objects.create(channel=channel, user=sender)
    ChannelMember.objects.create(channel=channel, user=member)

    recipient_ids = DjangoMessagingRepository().list_target_member_ids(
        topic_id=topic.id, group_id=None, direct_chat_id=None, user_id=sender.id
    )

    assert recipient_ids == [member.id]
    assert outsider.id not in recipient_ids


@pytest.mark.django_db
def test_list_target_member_ids_for_a_group_excludes_the_caller(three_users):
    sender, member, _outsider = three_users
    group = Group.objects.create(name="Group", creator=sender)
    GroupMember.objects.create(group=group, user=sender, is_admin=True)
    GroupMember.objects.create(group=group, user=member)

    recipient_ids = DjangoMessagingRepository().list_target_member_ids(
        topic_id=None, group_id=group.id, direct_chat_id=None, user_id=sender.id
    )

    assert recipient_ids == [member.id]


@pytest.mark.django_db
def test_list_target_member_ids_for_a_direct_chat_returns_just_the_other_participant(
    three_users,
):
    sender, other, _outsider = three_users
    direct_chat = DirectChat.objects.create(user1=sender, user2=other)

    recipient_ids = DjangoMessagingRepository().list_target_member_ids(
        topic_id=None, group_id=None, direct_chat_id=direct_chat.id, user_id=sender.id
    )

    assert recipient_ids == [other.id]


@pytest.mark.django_db
def test_list_target_member_ids_returns_empty_for_a_nonexistent_topic(three_users):
    sender, _member, _outsider = three_users

    recipient_ids = DjangoMessagingRepository().list_target_member_ids(
        topic_id=999999, group_id=None, direct_chat_id=None, user_id=sender.id
    )

    assert recipient_ids == []
