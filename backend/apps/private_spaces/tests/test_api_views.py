import pytest
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.private_spaces.models import DirectChat, Group, GroupInvitation, GroupMember


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


@pytest.mark.django_db
class TestDirectChats:
    def test_create_matches_contract_and_reuses_reverse_order_chat(self, users):
        first, second = users[:2]

        created = authenticated_client(second).post(
            "/api/dms/", {"target_user_id": first.id}, format="json"
        )
        existing = authenticated_client(first).post(
            "/api/dms/", {"target_user_id": second.id}, format="json"
        )

        assert created.status_code == 201
        assert existing.status_code == 200
        assert existing.json() == created.json()
        assert set(created.json()) == {
            "direct_chat_id",
            "user1_id",
            "user2_id",
            "created_at",
        }
        assert created.json()["user1_id"] == min(first.id, second.id)
        assert created.json()["user2_id"] == max(first.id, second.id)
        assert DirectChat.objects.count() == 1

    def test_list_is_a_raw_array_containing_only_the_users_chats(self, users):
        first, second, third = users[:3]
        own_chat = DirectChat.objects.create(user1=first, user2=second)
        DirectChat.objects.create(user1=second, user2=third)

        response = authenticated_client(first).get("/api/dms/")

        assert response.status_code == 200
        assert response.json() == [
            {
                "direct_chat_id": own_chat.id,
                "user1_id": first.id,
                "user2_id": second.id,
                "created_at": own_chat.created_at.isoformat().replace("+00:00", "Z"),
            }
        ]

    def test_only_a_participant_can_hard_delete_a_chat(self, users):
        first, second, outsider = users[:3]
        chat = DirectChat.objects.create(user1=first, user2=second)

        forbidden = authenticated_client(outsider).delete(f"/api/dms/{chat.id}/")
        deleted = authenticated_client(first).delete(f"/api/dms/{chat.id}/")

        assert forbidden.status_code == 404
        assert deleted.status_code == 204
        assert deleted.content == b""
        assert not DirectChat.objects.filter(pk=chat.id).exists()


@pytest.mark.django_db
class TestGroups:
    def test_create_adds_creator_as_admin_and_matches_contract(self, users):
        creator = users[0]

        response = authenticated_client(creator).post(
            "/api/groups/", {"name": "Weekend CTF Team"}, format="json"
        )

        assert response.status_code == 201
        assert set(response.json()) == {
            "group_id",
            "name",
            "creator_id",
            "created_at",
        }
        assert response.json()["name"] == "Weekend CTF Team"
        assert response.json()["creator_id"] == creator.id
        assert GroupMember.objects.get(
            group_id=response.json()["group_id"], user=creator
        ).is_admin

    def test_member_can_list_edit_leave_and_delete_group(self, users):
        creator, member = users[:2]
        group = Group.objects.create(name="Original", creator=creator)
        GroupMember.objects.create(group=group, user=creator, is_admin=True)
        GroupMember.objects.create(group=group, user=member)
        client = authenticated_client(member)

        listed = client.get("/api/groups/")
        edited = client.patch(
            f"/api/groups/{group.id}/", {"name": "Updated"}, format="json"
        )
        left = client.delete(f"/api/groups/{group.id}/leave/")
        deleted = authenticated_client(creator).delete(f"/api/groups/{group.id}/")

        assert [item["group_id"] for item in listed.json()] == [group.id]
        assert edited.status_code == 200
        assert edited.json()["name"] == "Updated"
        assert left.status_code == 204
        assert deleted.status_code == 204
        assert not Group.objects.filter(pk=group.id).exists()


@pytest.mark.django_db
class TestGroupInvitations:
    def test_invitation_respects_profile_privacy_flag(self, users):
        inviter, invitee = users[:2]
        group = Group.objects.create(name="Private", creator=inviter)
        GroupMember.objects.create(group=group, user=inviter, is_admin=True)
        invitee.profile.allow_group_invitations = False
        invitee.profile.save(update_fields=("allow_group_invitations",))

        response = authenticated_client(inviter).post(
            f"/api/groups/{group.id}/invitations/",
            {"invitee_id": invitee.id},
            format="json",
        )

        assert response.status_code == 403
        assert GroupInvitation.objects.count() == 0

    def test_create_and_accept_invitation_match_contract(self, users):
        inviter, invitee = users[:2]
        group = Group.objects.create(name="Private", creator=inviter)
        GroupMember.objects.create(group=group, user=inviter, is_admin=True)

        created = authenticated_client(inviter).post(
            f"/api/groups/{group.id}/invitations/",
            {"invitee_id": invitee.id},
            format="json",
        )
        invitation_id = created.json()["invitation_id"]
        accepted = authenticated_client(invitee).patch(
            f"/api/invitations/{invitation_id}/",
            {"status": "ACCEPTED"},
            format="json",
        )

        assert created.status_code == 201
        assert created.json() == {
            "invitation_id": invitation_id,
            "group_id": group.id,
            "inviter_id": inviter.id,
            "invitee_id": invitee.id,
            "status": "PENDING",
        }
        assert accepted.status_code == 200
        assert accepted.json() == {
            "invitation_id": invitation_id,
            "status": "ACCEPTED",
        }
        membership = GroupMember.objects.get(group=group, user=invitee)
        assert membership.is_admin is False

    def test_declining_does_not_add_a_member(self, users):
        inviter, invitee = users[:2]
        group = Group.objects.create(name="Private", creator=inviter)
        GroupMember.objects.create(group=group, user=inviter, is_admin=True)
        invitation = GroupInvitation.objects.create(
            group=group,
            inviter=inviter,
            invitee=invitee,
        )

        response = authenticated_client(invitee).patch(
            f"/api/invitations/{invitation.id}/",
            {"status": "DECLINED"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["status"] == "DECLINED"
        assert not GroupMember.objects.filter(group=group, user=invitee).exists()
