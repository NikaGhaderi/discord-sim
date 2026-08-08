from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
import pytest
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.messaging.models import Media, Message, MessageHistory
from apps.private_spaces.models import DirectChat, Group, GroupMember
from apps.workspaces.models import (
    Channel,
    ChannelMember,
    ChannelRole,
    Topic,
    UserChannelRole,
)


@pytest.fixture
def users(db):
    return [
        User.objects.create_user(
            username=f"api-message-user-{index}",
            email=f"api-message-{index}@example.com",
        )
        for index in range(1, 5)
    ]


@pytest.fixture
def spaces(users):
    sender, participant, outsider, moderator = users
    channel = Channel.objects.create(name="Channel", creator=sender)
    topic = Topic.objects.create(title="Topic", channel=channel)
    ChannelMember.objects.create(channel=channel, user=sender)
    ChannelMember.objects.create(channel=channel, user=participant)
    ChannelMember.objects.create(channel=channel, user=moderator)
    group = Group.objects.create(name="Group", creator=sender)
    GroupMember.objects.create(group=group, user=sender, is_admin=True)
    GroupMember.objects.create(group=group, user=participant)
    direct_chat = DirectChat.objects.create(user1=sender, user2=participant)
    return {
        "sender": sender,
        "participant": participant,
        "outsider": outsider,
        "moderator": moderator,
        "channel": channel,
        "topic": topic,
        "group": group,
        "direct_chat": direct_chat,
    }


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_send_text_matches_contract_and_checks_membership(spaces):
    topic = spaces["topic"]
    payload = {
        "topic_id": topic.id,
        "group_id": None,
        "direct_chat_id": None,
        "content": "Does anyone have the sprint backlog?",
    }

    created = client_for(spaces["sender"]).post(
        "/api/messages/", payload, format="json"
    )
    rejected = client_for(spaces["outsider"]).post(
        "/api/messages/", payload, format="json"
    )

    assert created.status_code == 201
    assert set(created.json()) == {
        "base_message_id",
        "sender_id",
        "content",
        "sent_at",
        "is_edited",
    }
    assert created.json()["is_edited"] is False
    assert rejected.status_code == 404


@pytest.mark.django_db
def test_history_is_scoped_paginated_and_includes_media(spaces):
    group = spaces["group"]
    sender = spaces["sender"]
    first = Message.objects.create(sender=sender, group=group, content="first")
    second = Message.objects.create(sender=sender, group=group, content="second")
    Media.objects.create(
        base_message=second,
        file="message_media/backlog.pdf",
        file_type="application/pdf",
        file_size=100,
    )

    response = client_for(sender).get(
        f"/api/messages/?group_id={group.id}&limit=1&offset=1"
    )

    assert response.status_code == 200
    assert response.json()["count"] == 2
    assert len(response.json()["results"]) == 1
    assert response.json()["results"][0]["base_message_id"] == second.id
    assert response.json()["results"][0]["media"] == [
        {
            "file_url": "/media/message_media/backlog.pdf",
            "file_type": "application/pdf",
        }
    ]
    assert first.id != second.id
    # offset=1 + limit=1 reaches the end of a 2-item set: no next page, but
    # there is a previous page (back to offset 0).
    assert response.json()["next"] is None
    assert "offset=1" not in response.json()["previous"]
    assert "limit=1" in response.json()["previous"]


@pytest.mark.django_db
def test_history_pagination_next_link_points_past_the_current_page(spaces):
    group = spaces["group"]
    sender = spaces["sender"]
    for index in range(3):
        Message.objects.create(sender=sender, group=group, content=f"msg-{index}")

    response = client_for(sender).get(
        f"/api/messages/?group_id={group.id}&limit=1&offset=0"
    )

    assert response.json()["previous"] is None
    next_url = response.json()["next"]
    assert next_url is not None
    assert "offset=1" in next_url
    assert "limit=1" in next_url


@pytest.mark.django_db
def test_search_only_returns_content_matches_in_authorized_space(spaces):
    group = spaces["group"]
    sender = spaces["sender"]
    Message.objects.create(sender=sender, group=group, content="sprint backlog")
    Message.objects.create(sender=sender, group=group, content="unrelated")

    response = client_for(sender).get(
        f"/api/messages/search/?q=sprint&group_id={group.id}"
    )
    rejected = client_for(spaces["outsider"]).get(
        f"/api/messages/search/?q=sprint&group_id={group.id}"
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["results"][0]["content"] == "sprint backlog"
    assert rejected.status_code == 404


@pytest.mark.django_db
def test_search_matches_word_stems_not_just_substrings(spaces):
    # Proves real Postgres full-text search is in use, not `icontains`:
    # a search for "run" must match "running" (stemmed), and a search for
    # "sprints" (plural) must match "sprint" -- neither is a literal
    # substring match in the other direction.
    group = spaces["group"]
    sender = spaces["sender"]
    Message.objects.create(sender=sender, group=group, content="running the migration")
    Message.objects.create(sender=sender, group=group, content="sprint planning")

    stem_match = client_for(sender).get(
        f"/api/messages/search/?q=run&group_id={group.id}"
    )
    plural_match = client_for(sender).get(
        f"/api/messages/search/?q=sprints&group_id={group.id}"
    )

    assert stem_match.json()["count"] == 1
    assert stem_match.json()["results"][0]["content"] == "running the migration"
    assert plural_match.json()["count"] == 1
    assert plural_match.json()["results"][0]["content"] == "sprint planning"


@pytest.mark.django_db
def test_edit_writes_old_content_to_history(spaces):
    sender = spaces["sender"]
    message = Message.objects.create(
        sender=sender,
        direct_chat=spaces["direct_chat"],
        content="old",
    )

    response = client_for(sender).patch(
        f"/api/messages/{message.id}/", {"content": "new"}, format="json"
    )

    message.refresh_from_db()
    assert response.status_code == 200
    assert response.json()["content"] == "new"
    assert response.json()["is_edited"] is True
    assert message.content == "new"
    assert MessageHistory.objects.get(base_message=message).old_content == "old"


@pytest.mark.django_db
def test_only_sender_can_edit(spaces):
    message = Message.objects.create(
        sender=spaces["sender"],
        direct_chat=spaces["direct_chat"],
        content="old",
    )

    response = client_for(spaces["participant"]).patch(
        f"/api/messages/{message.id}/", {"content": "hijacked"}, format="json"
    )

    assert response.status_code == 403
    assert MessageHistory.objects.count() == 0


@pytest.mark.django_db
def test_delete_messages_permission_does_not_grant_edit_access(spaces):
    channel = spaces["channel"]
    moderator = spaces["moderator"]
    role = ChannelRole.objects.create(
        channel=channel,
        name="Moderator",
        permissions=["DELETE_MESSAGES"],
    )
    UserChannelRole.objects.create(channel=channel, user=moderator, role=role)
    message = Message.objects.create(
        sender=spaces["sender"],
        topic=spaces["topic"],
        content="old",
    )

    response = client_for(moderator).patch(
        f"/api/messages/{message.id}/", {"content": "hijacked"}, format="json"
    )

    assert response.status_code == 403
    assert MessageHistory.objects.count() == 0
    message.refresh_from_db()
    assert message.content == "old"


@pytest.mark.django_db
def test_sender_and_channel_moderator_can_hard_delete(spaces):
    sender = spaces["sender"]
    moderator = spaces["moderator"]
    channel = spaces["channel"]
    role = ChannelRole.objects.create(
        channel=channel,
        name="Moderator",
        permissions=["DELETE_MESSAGES"],
    )
    UserChannelRole.objects.create(
        channel=channel,
        user=moderator,
        role=role,
    )
    by_sender = Message.objects.create(
        sender=sender, topic=spaces["topic"], content="sender deletes"
    )
    by_moderator = Message.objects.create(
        sender=sender, topic=spaces["topic"], content="moderator deletes"
    )

    sender_response = client_for(sender).delete(f"/api/messages/{by_sender.id}/")
    moderator_response = client_for(moderator).delete(
        f"/api/messages/{by_moderator.id}/"
    )

    assert sender_response.status_code == 204
    assert moderator_response.status_code == 204
    assert Message.objects.count() == 0


@pytest.mark.django_db
def test_non_sender_cannot_delete_direct_message(spaces):
    message = Message.objects.create(
        sender=spaces["sender"],
        direct_chat=spaces["direct_chat"],
        content="keep",
    )

    response = client_for(spaces["participant"]).delete(f"/api/messages/{message.id}/")

    assert response.status_code == 403
    assert Message.objects.filter(pk=message.id).exists()


@pytest.mark.django_db
def test_group_admin_can_delete_another_members_message(spaces):
    message = Message.objects.create(
        sender=spaces["participant"],
        group=spaces["group"],
        content="moderated",
    )

    response = client_for(spaces["sender"]).delete(f"/api/messages/{message.id}/")

    assert response.status_code == 204
    assert not Message.objects.filter(pk=message.id).exists()


@pytest.mark.django_db
def test_channel_media_requires_sender_and_send_media_permission(spaces, tmp_path):
    sender = spaces["sender"]
    channel = spaces["channel"]
    message = Message.objects.create(
        sender=sender,
        topic=spaces["topic"],
        content="attachment",
    )
    client = client_for(sender)

    with override_settings(MEDIA_ROOT=tmp_path):
        rejected = client.post(
            f"/api/messages/{message.id}/media/",
            {"file": SimpleUploadedFile("notes.txt", b"notes", "text/plain")},
            format="multipart",
        )
        role = ChannelRole.objects.create(
            channel=channel,
            name="Uploader",
            permissions=["SEND_MEDIA"],
        )
        UserChannelRole.objects.create(
            channel=channel,
            user=sender,
            role=role,
        )
        created = client.post(
            f"/api/messages/{message.id}/media/",
            {"file": SimpleUploadedFile("notes.txt", b"notes", "text/plain")},
            format="multipart",
        )

    assert rejected.status_code == 403
    assert created.status_code == 201
    assert set(created.json()) == {
        "media_id",
        "base_message_id",
        "file_url",
        "file_type",
        "file_size",
    }
    assert created.json()["file_type"] == "text/plain"
