import pytest
from django.db import IntegrityError, transaction

from apps.authentication.models import User
from apps.private_spaces.models import DirectChat, Group, GroupMember


@pytest.mark.django_db
def test_direct_chat_database_constraints_prevent_duplicates_and_self_chats():
    first = User.objects.create_user(username="first", email="first@example.com")
    second = User.objects.create_user(username="second", email="second@example.com")
    DirectChat.objects.create(user1=first, user2=second)

    with pytest.raises(IntegrityError), transaction.atomic():
        DirectChat.objects.create(user1=first, user2=second)
    with pytest.raises(IntegrityError), transaction.atomic():
        DirectChat.objects.create(user1=first, user2=first)


@pytest.mark.django_db
def test_group_delete_cascades_memberships_and_invitations():
    creator = User.objects.create_user(username="creator", email="creator@example.com")
    group = Group.objects.create(name="Group", creator=creator)
    GroupMember.objects.create(group=group, user=creator)

    group.delete()

    assert GroupMember.objects.count() == 0
