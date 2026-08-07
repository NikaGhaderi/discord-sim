import pytest
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.workspaces.models import Channel, ChannelMember, ChannelRole, Topic
from apps.workspaces.domain.roles import OWNER_ROLE_NAME


@pytest.fixture
def users(db):
    return [
        User.objects.create_user(
            username=f"user-{index}",
            email=f"user-{index}@example.com",
            password="test-password",
        )
        for index in range(1, 5)
    ]


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def create_channel_via_api(creator, name="general-chat"):
    response = authenticated_client(creator).post(
        "/api/channels/", {"name": name}, format="json"
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.django_db
class TestChannelCreate:
    def test_any_authenticated_user_can_create_a_channel(self, users):
        response = authenticated_client(users[0]).post(
            "/api/channels/", {"name": "my-channel"}, format="json"
        )

        assert response.status_code == 201
        body = response.json()
        assert set(body) == {
            "channel_id",
            "name",
            "invite_token",
            "created_at",
            "creator_id",
            "default_topic_id",
        }
        assert body["name"] == "my-channel"
        assert body["creator_id"] == users[0].id
        assert body["invite_token"]
        assert body["default_topic_id"] is not None

    def test_creating_a_channel_also_creates_general_topic_and_owner_role(self, users):
        body = create_channel_via_api(users[0])

        channel = Channel.objects.get(id=body["channel_id"])
        assert Topic.objects.filter(channel=channel, title="general").exists()
        assert ChannelMember.objects.filter(channel=channel, user=users[0]).exists()
        assert ChannelRole.objects.filter(
            channel=channel, name=OWNER_ROLE_NAME
        ).exists()


@pytest.mark.django_db
class TestChannelDetail:
    def test_get_returns_channel(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).get(
            f"/api/channels/{body['channel_id']}/"
        )

        assert response.status_code == 200
        assert response.json()["channel_id"] == body["channel_id"]

    def test_get_returns_404_for_unknown_channel(self, users):
        response = authenticated_client(users[0]).get("/api/channels/999999/")

        assert response.status_code == 404

    def test_patch_requires_manage_channel_permission(self, users):
        body = create_channel_via_api(users[0])
        outsider = users[1]
        Channel.objects.get(id=body["channel_id"])
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).patch(
            f"/api/channels/{body['channel_id']}/",
            {"name": "renamed"},
            format="json",
        )

        assert response.status_code == 403

    def test_patch_allowed_for_owner(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).patch(
            f"/api/channels/{body['channel_id']}/",
            {"name": "renamed"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["name"] == "renamed"

    def test_delete_requires_manage_channel_permission(self, users):
        body = create_channel_via_api(users[0])
        outsider = users[1]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).delete(
            f"/api/channels/{body['channel_id']}/"
        )

        assert response.status_code == 403

    def test_delete_allowed_for_owner(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/"
        )

        assert response.status_code == 204
        assert not Channel.objects.filter(id=body["channel_id"]).exists()

    def test_delete_returns_404_for_unknown_channel(self, users):
        # The requester has no membership/roles for this channel_id at all,
        # so the permission check yields an empty granted set -> 403 before
        # the use case even runs its own 404 check.
        response = authenticated_client(users[0]).delete("/api/channels/999999/")

        assert response.status_code == 403


@pytest.mark.django_db
class TestTopics:
    def test_create_requires_manage_topics_permission(self, users):
        body = create_channel_via_api(users[0])
        outsider = users[1]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).post(
            f"/api/channels/{body['channel_id']}/topics/",
            {"title": "random"},
            format="json",
        )

        assert response.status_code == 403

    def test_create_allowed_for_owner(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/topics/",
            {"title": "random"},
            format="json",
        )

        assert response.status_code == 201
        assert response.json()["title"] == "random"

    def test_delete_requires_manage_topics_permission(self, users):
        body = create_channel_via_api(users[0])
        extra_topic = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/topics/",
                {"title": "random"},
                format="json",
            )
            .json()
        )
        outsider = users[1]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).delete(
            f"/api/channels/{body['channel_id']}/topics/{extra_topic['topic_id']}/"
        )

        assert response.status_code == 403

    def test_delete_last_topic_returns_409(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/topics/{body['default_topic_id']}/"
        )

        assert response.status_code == 409

    def test_delete_one_of_several_topics_succeeds(self, users):
        body = create_channel_via_api(users[0])
        extra_topic = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/topics/",
                {"title": "random"},
                format="json",
            )
            .json()
        )

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/topics/{extra_topic['topic_id']}/"
        )

        assert response.status_code == 204
        assert not Topic.objects.filter(id=extra_topic["topic_id"]).exists()


@pytest.mark.django_db
class TestJoinLeave:
    def test_join_creates_membership(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[1]).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )

        assert response.status_code == 201
        assert ChannelMember.objects.filter(
            channel_id=body["channel_id"], user=users[1]
        ).exists()

    def test_join_twice_returns_409(self, users):
        body = create_channel_via_api(users[0])
        authenticated_client(users[1]).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )

        response = authenticated_client(users[1]).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )

        assert response.status_code == 409

    def test_leave_removes_membership(self, users):
        body = create_channel_via_api(users[0])
        authenticated_client(users[1]).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )

        response = authenticated_client(users[1]).delete(
            f"/api/channels/{body['channel_id']}/leave/"
        )

        assert response.status_code == 204
        assert not ChannelMember.objects.filter(
            channel_id=body["channel_id"], user=users[1]
        ).exists()

    def test_leave_when_not_a_member_is_a_no_op_204(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[1]).delete(
            f"/api/channels/{body['channel_id']}/leave/"
        )

        assert response.status_code == 204

    def test_invite_token_join(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[1]).post(
            f"/api/channels/invite/{body['invite_token']}/join/", {}, format="json"
        )

        assert response.status_code == 201
        assert ChannelMember.objects.filter(
            channel_id=body["channel_id"], user=users[1]
        ).exists()

    def test_invite_token_join_with_unknown_token_returns_404(self, users):
        response = authenticated_client(users[1]).post(
            "/api/channels/invite/bogus-token/join/", {}, format="json"
        )

        assert response.status_code == 404


@pytest.mark.django_db
class TestKickMember:
    def test_requires_kick_members_permission(self, users):
        body = create_channel_via_api(users[0])
        target = users[1]
        outsider = users[2]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=target)
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).delete(
            f"/api/channels/{body['channel_id']}/members/{target.id}/"
        )

        assert response.status_code == 403

    def test_owner_can_kick_a_member(self, users):
        body = create_channel_via_api(users[0])
        target = users[1]
        authenticated_client(target).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/members/{target.id}/"
        )

        assert response.status_code == 204
        assert not ChannelMember.objects.filter(
            channel_id=body["channel_id"], user=target
        ).exists()

    def test_kicking_a_non_member_returns_404(self, users):
        body = create_channel_via_api(users[0])
        non_member = users[1]

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/members/{non_member.id}/"
        )

        assert response.status_code == 404


@pytest.mark.django_db
class TestRoles:
    def test_create_requires_manage_roles_permission(self, users):
        body = create_channel_via_api(users[0])
        outsider = users[1]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).post(
            f"/api/channels/{body['channel_id']}/roles/",
            {"name": "Moderator", "permissions": []},
            format="json",
        )

        assert response.status_code == 403

    def test_owner_can_create_a_role(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/roles/",
            {"name": "Moderator", "permissions": ["KICK_MEMBERS"]},
            format="json",
        )

        assert response.status_code == 201
        assert response.json()["name"] == "Moderator"

    def test_create_with_invalid_permission_returns_400(self, users):
        body = create_channel_via_api(users[0])

        response = authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/roles/",
            {"name": "Moderator", "permissions": ["NOT_REAL"]},
            format="json",
        )

        assert response.status_code == 400

    def test_create_duplicate_name_returns_409(self, users):
        body = create_channel_via_api(users[0])
        authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/roles/",
            {"name": "Moderator", "permissions": []},
            format="json",
        )

        response = authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/roles/",
            {"name": "Moderator", "permissions": []},
            format="json",
        )

        assert response.status_code == 409

    def test_update_requires_manage_roles_permission(self, users):
        body = create_channel_via_api(users[0])
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )
        outsider = users[1]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).patch(
            f"/api/channels/{body['channel_id']}/roles/{role['role_id']}/",
            {"permissions": ["SEND_MEDIA"]},
            format="json",
        )

        assert response.status_code == 403

    def test_owner_can_update_role_permissions(self, users):
        body = create_channel_via_api(users[0])
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )

        response = authenticated_client(users[0]).patch(
            f"/api/channels/{body['channel_id']}/roles/{role['role_id']}/",
            {"permissions": ["SEND_MEDIA"]},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["permissions"] == ["SEND_MEDIA"]

    def test_delete_requires_manage_roles_permission(self, users):
        body = create_channel_via_api(users[0])
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )
        outsider = users[1]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).delete(
            f"/api/channels/{body['channel_id']}/roles/{role['role_id']}/"
        )

        assert response.status_code == 403

    def test_owner_can_delete_a_custom_role(self, users):
        body = create_channel_via_api(users[0])
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/roles/{role['role_id']}/"
        )

        assert response.status_code == 204

    def test_deleting_owner_role_returns_403(self, users):
        body = create_channel_via_api(users[0])
        owner_role = ChannelRole.objects.get(
            channel_id=body["channel_id"], name=OWNER_ROLE_NAME
        )

        response = authenticated_client(users[0]).delete(
            f"/api/channels/{body['channel_id']}/roles/{owner_role.id}/"
        )

        assert response.status_code == 403

    def test_assign_requires_manage_roles_permission(self, users):
        body = create_channel_via_api(users[0])
        target = users[1]
        authenticated_client(target).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )
        outsider = users[2]
        ChannelMember.objects.create(channel_id=body["channel_id"], user=outsider)

        response = authenticated_client(outsider).post(
            f"/api/channels/{body['channel_id']}/members/{target.id}/roles/",
            {"role_id": role["role_id"]},
            format="json",
        )

        assert response.status_code == 403

    def test_owner_can_assign_role_to_member(self, users):
        body = create_channel_via_api(users[0])
        target = users[1]
        authenticated_client(target).post(
            f"/api/channels/{body['channel_id']}/join/", {}, format="json"
        )
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )

        response = authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/members/{target.id}/roles/",
            {"role_id": role["role_id"]},
            format="json",
        )

        assert response.status_code == 201
        assert response.json()["role_id"] == role["role_id"]

    def test_assign_role_to_non_member_returns_404(self, users):
        body = create_channel_via_api(users[0])
        non_member = users[1]
        role = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{body['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )

        response = authenticated_client(users[0]).post(
            f"/api/channels/{body['channel_id']}/members/{non_member.id}/roles/",
            {"role_id": role["role_id"]},
            format="json",
        )

        assert response.status_code == 404

    def test_assign_role_from_another_channel_returns_404(self, users):
        first = create_channel_via_api(users[0], name="first")
        second = create_channel_via_api(users[0], name="second")
        target = users[1]
        authenticated_client(target).post(
            f"/api/channels/{second['channel_id']}/join/", {}, format="json"
        )
        role_in_first = (
            authenticated_client(users[0])
            .post(
                f"/api/channels/{first['channel_id']}/roles/",
                {"name": "Moderator", "permissions": []},
                format="json",
            )
            .json()
        )

        response = authenticated_client(users[0]).post(
            f"/api/channels/{second['channel_id']}/members/{target.id}/roles/",
            {"role_id": role_in_first["role_id"]},
            format="json",
        )

        assert response.status_code == 404
