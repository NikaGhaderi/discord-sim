import pytest

from apps.authentication.models import User
from apps.permissions.domain.permissions import PermissionCode
from apps.workspaces.domain.exceptions import (
    AlreadyChannelMemberError,
    ChannelMemberNotFoundError,
    ChannelNotFoundError,
    ChannelRoleNotFoundError,
    DuplicateRoleNameError,
    OwnerRoleImmutableError,
    TopicNotFoundError,
)
from apps.workspaces.domain.roles import EVERYONE_ROLE_NAME, OWNER_ROLE_NAME
from apps.workspaces.repositories import DjangoChannelRepository


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


@pytest.fixture
def repo():
    return DjangoChannelRepository()


@pytest.mark.django_db
class TestChannelCrud:
    def test_create_channel_sets_invite_token(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        assert channel.invite_token
        assert channel.creator_id == users[0].id

    def test_get_channel_raises_for_unknown_id(self, repo):
        with pytest.raises(ChannelNotFoundError):
            repo.get_channel(999)

    def test_get_channel_by_invite_token(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        found = repo.get_channel_by_invite_token(channel.invite_token)

        assert found.id == channel.id

    def test_get_channel_by_invite_token_raises_for_unknown_token(self, repo):
        with pytest.raises(ChannelNotFoundError):
            repo.get_channel_by_invite_token("bogus")

    def test_update_channel(self, repo, users):
        channel = repo.create_channel("old", users[0].id)

        updated = repo.update_channel(channel.id, "new")

        assert updated.name == "new"

    def test_delete_channel(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        repo.delete_channel(channel.id)

        with pytest.raises(ChannelNotFoundError):
            repo.get_channel(channel.id)


@pytest.mark.django_db
class TestTopics:
    def test_create_topic_raises_for_unknown_channel(self, repo):
        with pytest.raises(ChannelNotFoundError):
            repo.create_topic(999, "random")

    def test_get_topic_raises_for_unknown_id(self, repo):
        with pytest.raises(TopicNotFoundError):
            repo.get_topic(999)

    def test_delete_topic_raises_for_unknown_id(self, repo):
        with pytest.raises(TopicNotFoundError):
            repo.delete_topic(999)

    def test_count_active_topics_raises_for_unknown_channel(self, repo):
        with pytest.raises(ChannelNotFoundError):
            repo.count_active_topics(999)

    def test_set_default_topic_raises_for_unknown_topic(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        with pytest.raises(TopicNotFoundError):
            repo.set_default_topic(channel.id, 999)


@pytest.mark.django_db
class TestListChannelsForUser:
    def test_returns_only_channels_the_user_is_a_member_of(self, repo, users):
        member_channel = repo.create_channel("joined", users[0].id)
        repo.add_member(member_channel.id, users[0].id)
        other_channel = repo.create_channel("not-joined", users[1].id)
        repo.add_member(other_channel.id, users[1].id)

        result = repo.list_channels_for_user(users[0].id)

        assert [c.id for c in result] == [member_channel.id]

    def test_creator_who_never_joined_is_excluded(self, repo, users):
        repo.create_channel("mine", users[0].id)

        result = repo.list_channels_for_user(users[0].id)

        assert result == []


@pytest.mark.django_db
class TestMembership:
    def test_add_member(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        member = repo.add_member(channel.id, users[1].id, "nick")

        assert member.user_id == users[1].id
        assert member.nickname_in_channel == "nick"
        assert repo.is_member(channel.id, users[1].id)

    def test_add_member_twice_raises(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[1].id)

        with pytest.raises(AlreadyChannelMemberError):
            repo.add_member(channel.id, users[1].id)

    def test_remove_member_raises_for_non_member(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        with pytest.raises(ChannelMemberNotFoundError):
            repo.remove_member(channel.id, users[1].id)

    def test_remove_member_also_deletes_user_channel_roles(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[1].id)
        role = repo.create_role(channel.id, "Moderator", [])
        repo.assign_role(channel.id, users[1].id, role.id)

        repo.remove_member(channel.id, users[1].id)

        assert repo.get_user_permissions(channel.id, users[1].id) == []

    def test_is_member_false_for_stranger(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        assert repo.is_member(channel.id, users[1].id) is False


@pytest.mark.django_db
class TestRoles:
    def test_create_role_duplicate_name_raises(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.create_role(channel.id, "Moderator", [])

        with pytest.raises(DuplicateRoleNameError):
            repo.create_role(channel.id, "Moderator", [])

    def test_get_role_raises_for_unknown_id(self, repo):
        with pytest.raises(ChannelRoleNotFoundError):
            repo.get_role(999)

    def test_get_role_by_name_returns_none_when_absent(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        assert repo.get_role_by_name(channel.id, "Nope") is None

    def test_update_role_raises_for_unknown_id(self, repo):
        with pytest.raises(ChannelRoleNotFoundError):
            repo.update_role(999, [])

    def test_delete_role_raises_for_unknown_id(self, repo):
        with pytest.raises(ChannelRoleNotFoundError):
            repo.delete_role(999)

    def test_delete_role_blocks_owner_role(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        owner_role = repo.create_role(channel.id, OWNER_ROLE_NAME, [])

        with pytest.raises(OwnerRoleImmutableError):
            repo.delete_role(owner_role.id)

    def test_assign_role_is_idempotent_on_duplicate_assignment(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[1].id)
        role = repo.create_role(channel.id, "Moderator", [])

        first = repo.assign_role(channel.id, users[1].id, role.id)
        second = repo.assign_role(channel.id, users[1].id, role.id)

        assert first.id == second.id

    def test_get_user_permissions_empty_for_no_roles(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[1].id)

        assert repo.get_user_permissions(channel.id, users[1].id) == []

    def test_get_user_permissions_single_role(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[1].id)
        role = repo.create_role(channel.id, "Moderator", ["KICK_MEMBERS"])
        repo.assign_role(channel.id, users[1].id, role.id)

        assert repo.get_user_permissions(channel.id, users[1].id) == ["KICK_MEMBERS"]

    def test_get_user_permissions_unions_overlapping_roles_without_duplicates(
        self, repo, users
    ):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[1].id)
        role_a = repo.create_role(channel.id, "RoleA", ["KICK_MEMBERS", "SEND_MEDIA"])
        role_b = repo.create_role(
            channel.id, "RoleB", ["SEND_MEDIA", "DELETE_MESSAGES"]
        )
        repo.assign_role(channel.id, users[1].id, role_a.id)
        repo.assign_role(channel.id, users[1].id, role_b.id)

        result = repo.get_user_permissions(channel.id, users[1].id)

        assert sorted(result) == sorted(
            {"KICK_MEMBERS", "SEND_MEDIA", "DELETE_MESSAGES"}
        )
        assert len(result) == len(set(result))

    def test_update_role_blocks_owner_role(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        owner_role = repo.create_role(channel.id, OWNER_ROLE_NAME, [])

        with pytest.raises(OwnerRoleImmutableError):
            repo.update_role(owner_role.id, ["KICK_MEMBERS"])


@pytest.mark.django_db
class TestOwnerRolePermissionsAreLive:
    def test_get_role_ignores_stored_permissions_for_owner(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        # Persist an Owner row with a deliberately stale/empty permission
        # list -- reads must still report the full, current catalog.
        owner_role = repo.create_role(channel.id, OWNER_ROLE_NAME, [])

        refetched = repo.get_role(owner_role.id)

        assert set(refetched.permissions) == {code.value for code in PermissionCode}

    def test_get_role_by_name_ignores_stored_permissions_for_owner(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.create_role(channel.id, OWNER_ROLE_NAME, [])

        refetched = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        assert set(refetched.permissions) == {code.value for code in PermissionCode}

    def test_list_roles_reports_live_owner_permissions(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.create_role(channel.id, OWNER_ROLE_NAME, [])
        repo.create_role(channel.id, "Moderator", ["KICK_MEMBERS"])

        roles = repo.list_roles(channel.id)

        owner = next(r for r in roles if r.name == OWNER_ROLE_NAME)
        moderator = next(r for r in roles if r.name == "Moderator")
        assert set(owner.permissions) == {code.value for code in PermissionCode}
        assert moderator.permissions == ["KICK_MEMBERS"]

    def test_get_user_permissions_reports_live_owner_permissions(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        owner_role = repo.create_role(channel.id, OWNER_ROLE_NAME, [])
        repo.add_member(channel.id, users[0].id)
        repo.assign_role(channel.id, users[0].id, owner_role.id)

        result = repo.get_user_permissions(channel.id, users[0].id)

        assert set(result) == {code.value for code in PermissionCode}

    def test_non_owner_role_permissions_are_not_live(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        role = repo.create_role(channel.id, "Moderator", ["KICK_MEMBERS"])

        refetched = repo.get_role(role.id)

        assert refetched.permissions == ["KICK_MEMBERS"]


@pytest.mark.django_db
class TestListMembers:
    def test_returns_all_members(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[0].id)
        repo.add_member(channel.id, users[1].id)

        members = repo.list_members(channel.id)

        assert {m.user_id for m in members} == {users[0].id, users[1].id}

    def test_returns_empty_list_for_channel_with_no_members(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        assert repo.list_members(channel.id) == []

    def test_does_not_include_members_of_other_channels(self, repo, users):
        channel = repo.create_channel("a", users[0].id)
        other = repo.create_channel("b", users[1].id)
        repo.add_member(channel.id, users[0].id)
        repo.add_member(other.id, users[1].id)

        members = repo.list_members(channel.id)

        assert {m.user_id for m in members} == {users[0].id}


@pytest.mark.django_db
class TestUpdateMemberNickname:
    def test_updates_and_persists_nickname(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.add_member(channel.id, users[0].id, "old-nick")

        updated = repo.update_member_nickname(channel.id, users[0].id, "new-nick")

        assert updated.nickname_in_channel == "new-nick"
        refetched = repo.list_members(channel.id)[0]
        assert refetched.nickname_in_channel == "new-nick"

    def test_raises_for_non_member(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        with pytest.raises(ChannelMemberNotFoundError):
            repo.update_member_nickname(channel.id, users[1].id, "nick")


@pytest.mark.django_db
class TestListRoles:
    def test_returns_all_roles_for_channel(self, repo, users):
        channel = repo.create_channel("general", users[0].id)
        repo.create_role(channel.id, OWNER_ROLE_NAME, [])
        repo.create_role(channel.id, EVERYONE_ROLE_NAME, [])
        repo.create_role(channel.id, "Moderator", [])

        roles = repo.list_roles(channel.id)

        assert {r.name for r in roles} == {
            OWNER_ROLE_NAME,
            EVERYONE_ROLE_NAME,
            "Moderator",
        }

    def test_returns_empty_list_when_channel_has_no_roles(self, repo, users):
        channel = repo.create_channel("general", users[0].id)

        assert repo.list_roles(channel.id) == []

    def test_does_not_include_roles_from_other_channels(self, repo, users):
        channel = repo.create_channel("a", users[0].id)
        other = repo.create_channel("b", users[0].id)
        repo.create_role(channel.id, "OnlyInA", [])

        roles = repo.list_roles(other.id)

        assert "OnlyInA" not in {r.name for r in roles}
