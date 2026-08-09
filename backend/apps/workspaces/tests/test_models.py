import pytest
from django.db import IntegrityError, transaction

from apps.authentication.models import User
from apps.workspaces.models import Channel, ChannelMember, ChannelRole, UserChannelRole


@pytest.fixture
def users(db):
    return [
        User.objects.create_user(
            username=f"user-{index}",
            email=f"user-{index}@example.com",
            password="test-password",
        )
        for index in range(1, 3)
    ]


@pytest.mark.django_db
def test_channel_member_unique_constraint_prevents_duplicate_membership(users):
    channel = Channel.objects.create(name="general", creator=users[0])
    ChannelMember.objects.create(channel=channel, user=users[0])

    with pytest.raises(IntegrityError), transaction.atomic():
        ChannelMember.objects.create(channel=channel, user=users[0])


@pytest.mark.django_db
def test_channel_role_unique_constraint_prevents_duplicate_name_in_channel(users):
    channel = Channel.objects.create(name="general", creator=users[0])
    ChannelRole.objects.create(channel=channel, name="Moderator", permissions=[])

    with pytest.raises(IntegrityError), transaction.atomic():
        ChannelRole.objects.create(channel=channel, name="Moderator", permissions=[])


@pytest.mark.django_db
def test_channel_role_same_name_allowed_across_different_channels(users):
    first = Channel.objects.create(name="first", creator=users[0])
    second = Channel.objects.create(name="second", creator=users[0])
    ChannelRole.objects.create(channel=first, name="Moderator", permissions=[])

    # Should not raise.
    ChannelRole.objects.create(channel=second, name="Moderator", permissions=[])

    assert ChannelRole.objects.filter(name="Moderator").count() == 2


@pytest.mark.django_db
def test_user_channel_role_unique_constraint_prevents_duplicate_assignment(users):
    channel = Channel.objects.create(name="general", creator=users[0])
    role = ChannelRole.objects.create(channel=channel, name="Moderator", permissions=[])
    UserChannelRole.objects.create(channel=channel, user=users[0], role=role)

    with pytest.raises(IntegrityError), transaction.atomic():
        UserChannelRole.objects.create(channel=channel, user=users[0], role=role)


@pytest.mark.django_db
def test_channel_delete_cascades_members_roles_and_user_roles(users):
    channel = Channel.objects.create(name="general", creator=users[0])
    ChannelMember.objects.create(channel=channel, user=users[0])
    role = ChannelRole.objects.create(channel=channel, name="Moderator", permissions=[])
    UserChannelRole.objects.create(channel=channel, user=users[0], role=role)

    channel.delete()

    assert ChannelMember.objects.count() == 0
    assert ChannelRole.objects.count() == 0
    assert UserChannelRole.objects.count() == 0


@pytest.mark.django_db
def test_channel_str_returns_name(users):
    channel = Channel.objects.create(name="general", creator=users[0])

    assert str(channel) == "general"
