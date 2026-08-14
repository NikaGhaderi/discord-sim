import pytest

from apps.permissions.domain.permissions import PermissionCode
from apps.workspaces.application.use_cases.assign_role import AssignRoleUseCase
from apps.workspaces.application.use_cases.count_active_topics import (
    CountActiveTopicsUseCase,
)
from apps.workspaces.application.use_cases.create_channel import CreateChannelUseCase
from apps.workspaces.application.use_cases.create_role import CreateRoleUseCase
from apps.workspaces.application.use_cases.create_topic import CreateTopicUseCase
from apps.workspaces.application.use_cases.delete_channel import DeleteChannelUseCase
from apps.workspaces.application.use_cases.delete_role import DeleteRoleUseCase
from apps.workspaces.application.use_cases.delete_topic import DeleteTopicUseCase
from apps.workspaces.application.use_cases.get_channel import GetChannelUseCase
from apps.workspaces.application.use_cases.get_topic import GetTopicUseCase
from apps.workspaces.application.use_cases.join_channel import JoinChannelUseCase
from apps.workspaces.application.use_cases.join_channel_by_invite_token import (
    JoinChannelByInviteTokenUseCase,
)
from apps.workspaces.application.use_cases.kick_member import KickMemberUseCase
from apps.workspaces.application.use_cases.leave_channel import LeaveChannelUseCase
from apps.workspaces.application.use_cases.list_channels import ListChannelsUseCase
from apps.workspaces.application.use_cases.update_channel import UpdateChannelUseCase
from apps.workspaces.application.use_cases.update_role import UpdateRoleUseCase
from apps.workspaces.application.use_cases.list_members import ListMembersUseCase
from apps.workspaces.application.use_cases.list_roles import ListRolesUseCase
from apps.workspaces.application.use_cases.remove_role_assignment import (
    RemoveRoleAssignmentUseCase,
)
from apps.workspaces.application.use_cases.update_member_nickname import (
    UpdateMemberNicknameUseCase,
)
from apps.workspaces.domain.exceptions import (
    AlreadyChannelMemberError,
    CannotKickChannelOwnerError,
    ChannelMemberNotFoundError,
    ChannelNotFoundError,
    ChannelRoleNotFoundError,
    DuplicateRoleNameError,
    InsufficientPermissionsError,
    InvalidPermissionCodeError,
    LastTopicDeletionError,
    OwnerRoleImmutableError,
    TopicNotFoundError,
)
from apps.workspaces.domain.roles import EVERYONE_ROLE_NAME, OWNER_ROLE_NAME
from apps.workspaces.tests.fakes import InMemoryChannelRepository


def make_channel(repo, creator_id=1, name="general-chat"):
    return CreateChannelUseCase(repo).execute(creator_id=creator_id, name=name)


def grant_role(repo, channel, user_id, permissions, requester_id=None, name=None):
    """Create a role with the given permissions and assign it to user_id,
    acting as the channel's owner (or an explicit requester) by default so
    the grant itself doesn't trip the new subset check."""
    requester_id = channel.creator_id if requester_id is None else requester_id
    name = name or f"role-for-{user_id}-{'-'.join(sorted(permissions)) or 'none'}"
    role = CreateRoleUseCase(repo).execute(channel.id, requester_id, name, permissions)
    AssignRoleUseCase(repo).execute(channel.id, requester_id, user_id, role.id)
    return role


class TestCreateChannelUseCase:
    def test_creates_general_topic_and_sets_it_default(self):
        repo = InMemoryChannelRepository()

        channel = make_channel(repo)

        assert channel.default_topic_id is not None
        topic = repo.get_topic(channel.default_topic_id)
        assert topic.title == "general"
        assert topic.channel_id == channel.id

    def test_creates_creator_as_member(self):
        repo = InMemoryChannelRepository()

        channel = make_channel(repo, creator_id=7)

        assert repo.is_member(channel.id, 7)

    def test_creates_owner_role_with_all_permissions_and_assigns_it(self):
        repo = InMemoryChannelRepository()

        channel = make_channel(repo, creator_id=7)

        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)
        assert owner_role is not None
        assert set(owner_role.permissions) == {code.value for code in PermissionCode}
        assert set(repo.get_user_permissions(channel.id, 7)) == {
            code.value for code in PermissionCode
        }

    def test_creates_everyone_role_with_send_messages_by_default(self):
        repo = InMemoryChannelRepository()

        channel = make_channel(repo)

        everyone_role = repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME)
        assert everyone_role is not None
        assert everyone_role.permissions == ["SEND_MESSAGES"]

    def test_invite_token_is_generated_and_unique_per_channel(self):
        repo = InMemoryChannelRepository()

        first = make_channel(repo, creator_id=1, name="a")
        second = make_channel(repo, creator_id=1, name="b")

        assert first.invite_token
        assert second.invite_token
        assert first.invite_token != second.invite_token


class TestGetChannelUseCase:
    def test_returns_the_channel(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        result = GetChannelUseCase(repo).execute(channel.id)

        assert result.id == channel.id

    def test_raises_for_unknown_channel(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelNotFoundError):
            GetChannelUseCase(repo).execute(999)


class TestListChannelsUseCase:
    def test_returns_only_channels_the_user_is_a_member_of(self):
        repo = InMemoryChannelRepository()
        joined = make_channel(repo, creator_id=1, name="joined")
        make_channel(repo, creator_id=2, name="not-joined")
        JoinChannelUseCase(repo).execute(joined.id, user_id=5)

        result = ListChannelsUseCase(repo).execute(user_id=5)

        assert [c.id for c in result] == [joined.id]

    def test_creator_who_never_joins_does_not_see_own_channel(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1, name="mine")
        # The creator IS auto-added as a member by CreateChannelUseCase, so to
        # exercise "created but not a member" we bypass the use case.
        repo.remove_member(channel.id, 1)

        result = ListChannelsUseCase(repo).execute(user_id=1)

        assert result == []


class TestUpdateChannelUseCase:
    def test_updates_the_name(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        updated = UpdateChannelUseCase(repo).execute(channel.id, name="renamed")

        assert updated.name == "renamed"

    def test_raises_for_unknown_channel(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelNotFoundError):
            UpdateChannelUseCase(repo).execute(999, name="x")


class TestDeleteChannelUseCase:
    def test_deletes_the_channel(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        DeleteChannelUseCase(repo).execute(channel.id)

        with pytest.raises(ChannelNotFoundError):
            repo.get_channel(channel.id)


class TestCreateTopicUseCase:
    def test_creates_a_topic(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        topic = CreateTopicUseCase(repo).execute(channel.id, "random")

        assert topic.title == "random"
        assert topic.channel_id == channel.id

    def test_raises_for_unknown_channel(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelNotFoundError):
            CreateTopicUseCase(repo).execute(999, "random")


class TestGetTopicUseCase:
    def test_returns_the_topic(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        topic = CreateTopicUseCase(repo).execute(channel.id, "random")

        result = GetTopicUseCase(repo).execute(topic.id)

        assert result.id == topic.id

    def test_raises_for_unknown_topic(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(TopicNotFoundError):
            GetTopicUseCase(repo).execute(999)


class TestCountActiveTopicsUseCase:
    def test_counts_topics_in_channel(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)  # general topic already exists
        CreateTopicUseCase(repo).execute(channel.id, "random")

        count = CountActiveTopicsUseCase(repo).execute(channel.id)

        assert count == 2


class TestDeleteTopicUseCase:
    def test_blocks_deleting_the_last_remaining_topic(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)  # exactly 1 topic ("general")

        with pytest.raises(LastTopicDeletionError):
            DeleteTopicUseCase(repo).execute(channel.default_topic_id)

    def test_allows_deleting_when_two_topics_exist(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        extra = CreateTopicUseCase(repo).execute(channel.id, "random")

        DeleteTopicUseCase(repo).execute(extra.id)

        assert CountActiveTopicsUseCase(repo).execute(channel.id) == 1

    def test_raises_for_unknown_topic(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(TopicNotFoundError):
            DeleteTopicUseCase(repo).execute(999)


class TestJoinChannelUseCase:
    def test_creates_membership(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        member = JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        assert member.user_id == 2
        assert repo.is_member(channel.id, 2)

    def test_auto_assigns_everyone_role_if_present(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        everyone_role = repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME)
        UpdateRoleUseCase(repo).execute(
            everyone_role.id, 1, [PermissionCode.SEND_MEDIA.value]
        )

        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        assert repo.get_user_permissions(channel.id, 2) == [
            PermissionCode.SEND_MEDIA.value
        ]

    def test_does_not_crash_when_everyone_role_is_missing(self):
        repo = InMemoryChannelRepository()
        channel = repo.create_channel("bare", 1)
        # No topics/roles set up manually -- just membership via use case.

        member = JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        assert member.user_id == 2

    def test_joining_twice_raises(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        with pytest.raises(AlreadyChannelMemberError):
            JoinChannelUseCase(repo).execute(channel.id, user_id=2)

    def test_raises_for_unknown_channel(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelNotFoundError):
            JoinChannelUseCase(repo).execute(999, user_id=2)


class TestJoinChannelByInviteTokenUseCase:
    def test_resolves_channel_by_token_and_joins(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        member = JoinChannelByInviteTokenUseCase(repo).execute(
            channel.invite_token, user_id=2
        )

        assert member.channel_id == channel.id
        assert repo.is_member(channel.id, 2)

    def test_unknown_token_raises_channel_not_found(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelNotFoundError):
            JoinChannelByInviteTokenUseCase(repo).execute("bogus-token", user_id=2)


class TestLeaveChannelUseCase:
    def test_removes_membership(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        LeaveChannelUseCase(repo).execute(channel.id, user_id=2)

        assert not repo.is_member(channel.id, 2)

    def test_is_idempotent_for_a_non_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        # No exception expected.
        LeaveChannelUseCase(repo).execute(channel.id, user_id=999)

    def test_removes_user_channel_role_rows_on_leave(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        everyone_role = repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME)
        assert repo.get_user_permissions(channel.id, 2) == list(
            everyone_role.permissions
        )

        LeaveChannelUseCase(repo).execute(channel.id, user_id=2)

        assert repo.get_user_permissions(channel.id, 2) == []


class TestKickMemberUseCase:
    def test_removes_membership(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        KickMemberUseCase(repo).execute(channel.id, user_id=2)

        assert not repo.is_member(channel.id, 2)

    def test_raises_for_non_member_unlike_leave(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        with pytest.raises(ChannelMemberNotFoundError):
            KickMemberUseCase(repo).execute(channel.id, user_id=999)

    def test_removes_user_channel_role_rows_on_kick(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        KickMemberUseCase(repo).execute(channel.id, user_id=2)

        assert repo.get_user_permissions(channel.id, 2) == []


class TestCreateRoleUseCase:
    def test_creates_a_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        role = CreateRoleUseCase(repo).execute(
            channel.id,
            channel.creator_id,
            "Moderator",
            [PermissionCode.KICK_MEMBERS.value],
        )

        assert role.name == "Moderator"
        assert role.permissions == [PermissionCode.KICK_MEMBERS.value]

    def test_rejects_fully_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        with pytest.raises(InvalidPermissionCodeError):
            CreateRoleUseCase(repo).execute(
                channel.id, channel.creator_id, "Bad", ["NOT_REAL", "ALSO_BAD"]
            )

    def test_rejects_partially_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        with pytest.raises(InvalidPermissionCodeError):
            CreateRoleUseCase(repo).execute(
                channel.id,
                channel.creator_id,
                "Mixed",
                [PermissionCode.KICK_MEMBERS.value, "NOT_REAL"],
            )

    def test_duplicate_role_name_in_same_channel_raises(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        CreateRoleUseCase(repo).execute(channel.id, channel.creator_id, "Moderator", [])

        with pytest.raises(DuplicateRoleNameError):
            CreateRoleUseCase(repo).execute(
                channel.id, channel.creator_id, "Moderator", []
            )

    def test_same_role_name_allowed_in_different_channels(self):
        repo = InMemoryChannelRepository()
        first = make_channel(repo, creator_id=1, name="a")
        second = make_channel(repo, creator_id=1, name="b")
        CreateRoleUseCase(repo).execute(first.id, 1, "Moderator", [])

        role = CreateRoleUseCase(repo).execute(second.id, 1, "Moderator", [])

        assert role.channel_id == second.id

    def test_requester_without_the_permission_cannot_grant_it(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        # Give user 2 MANAGE_ROLES only -- not KICK_MEMBERS.
        grant_role(repo, channel, 2, [PermissionCode.MANAGE_ROLES.value])

        with pytest.raises(InsufficientPermissionsError):
            CreateRoleUseCase(repo).execute(
                channel.id, 2, "Escalated", [PermissionCode.KICK_MEMBERS.value]
            )

    def test_requester_holding_the_permission_can_grant_it(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        grant_role(
            repo,
            channel,
            2,
            [PermissionCode.MANAGE_ROLES.value, PermissionCode.KICK_MEMBERS.value],
        )

        role = CreateRoleUseCase(repo).execute(
            channel.id, 2, "Mod", [PermissionCode.KICK_MEMBERS.value]
        )

        assert role.permissions == [PermissionCode.KICK_MEMBERS.value]

    def test_owner_can_create_role_with_any_subset(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        role = CreateRoleUseCase(repo).execute(
            channel.id,
            channel.creator_id,
            "Anything",
            [PermissionCode.KICK_MEMBERS.value, PermissionCode.MANAGE_CHANNEL.value],
        )

        assert set(role.permissions) == {
            PermissionCode.KICK_MEMBERS.value,
            PermissionCode.MANAGE_CHANNEL.value,
        }


class TestUpdateRoleUseCase:
    def test_updates_permissions(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(
            channel.id, channel.creator_id, "Moderator", []
        )

        updated = UpdateRoleUseCase(repo).execute(
            role.id, channel.creator_id, [PermissionCode.DELETE_MESSAGES.value]
        )

        assert updated.permissions == [PermissionCode.DELETE_MESSAGES.value]

    def test_rejects_fully_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(
            channel.id, channel.creator_id, "Moderator", []
        )

        with pytest.raises(InvalidPermissionCodeError):
            UpdateRoleUseCase(repo).execute(role.id, channel.creator_id, ["NOT_REAL"])

    def test_rejects_partially_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(
            channel.id, channel.creator_id, "Moderator", []
        )

        with pytest.raises(InvalidPermissionCodeError):
            UpdateRoleUseCase(repo).execute(
                role.id,
                channel.creator_id,
                [PermissionCode.KICK_MEMBERS.value, "NOT_REAL"],
            )

    def test_raises_for_unknown_role(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelRoleNotFoundError):
            UpdateRoleUseCase(repo).execute(999, 1, [])

    def test_requester_without_the_permission_cannot_grant_it_on_update(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        grant_role(repo, channel, 2, [PermissionCode.MANAGE_ROLES.value])
        role = CreateRoleUseCase(repo).execute(channel.id, 1, "Mod", [])

        with pytest.raises(InsufficientPermissionsError):
            UpdateRoleUseCase(repo).execute(
                role.id, 2, [PermissionCode.KICK_MEMBERS.value]
            )

    def test_requester_holding_the_permission_can_grant_it_on_update(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        grant_role(
            repo,
            channel,
            2,
            [PermissionCode.MANAGE_ROLES.value, PermissionCode.KICK_MEMBERS.value],
        )
        role = CreateRoleUseCase(repo).execute(channel.id, 1, "Mod", [])

        updated = UpdateRoleUseCase(repo).execute(
            role.id, 2, [PermissionCode.KICK_MEMBERS.value]
        )

        assert updated.permissions == [PermissionCode.KICK_MEMBERS.value]

    def test_updating_owner_role_raises_immutable_regardless_of_requester(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        # Even the owner themself, granting an empty (trivially satisfiable)
        # permission set, cannot edit the Owner role.
        with pytest.raises(OwnerRoleImmutableError):
            UpdateRoleUseCase(repo).execute(owner_role.id, 1, [])


class TestDeleteRoleUseCase:
    def test_blocks_deleting_the_owner_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        with pytest.raises(OwnerRoleImmutableError):
            DeleteRoleUseCase(repo).execute(owner_role.id)

    def test_allows_deleting_the_everyone_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        everyone_role = repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME)

        DeleteRoleUseCase(repo).execute(everyone_role.id)

        with pytest.raises(ChannelRoleNotFoundError):
            repo.get_role(everyone_role.id)

    def test_allows_deleting_a_custom_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(
            channel.id, channel.creator_id, "Moderator", []
        )

        DeleteRoleUseCase(repo).execute(role.id)

        with pytest.raises(ChannelRoleNotFoundError):
            repo.get_role(role.id)

    def test_raises_for_unknown_role(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelRoleNotFoundError):
            DeleteRoleUseCase(repo).execute(999)


class TestAssignRoleUseCase:
    def test_assigns_role_to_a_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        role = CreateRoleUseCase(repo).execute(
            channel.id, 1, "Moderator", [PermissionCode.KICK_MEMBERS.value]
        )

        AssignRoleUseCase(repo).execute(channel.id, 1, 2, role.id)

        assert PermissionCode.KICK_MEMBERS.value in repo.get_user_permissions(
            channel.id, 2
        )

    def test_raises_for_non_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        role = CreateRoleUseCase(repo).execute(channel.id, 1, "Moderator", [])

        with pytest.raises(ChannelMemberNotFoundError):
            AssignRoleUseCase(repo).execute(channel.id, 1, 999, role.id)

    def test_raises_for_role_belonging_to_a_different_channel(self):
        repo = InMemoryChannelRepository()
        first = make_channel(repo, creator_id=1, name="a")
        second = make_channel(repo, creator_id=1, name="b")
        JoinChannelUseCase(repo).execute(second.id, user_id=2)
        role_in_first = CreateRoleUseCase(repo).execute(first.id, 1, "Moderator", [])

        with pytest.raises(ChannelRoleNotFoundError):
            AssignRoleUseCase(repo).execute(second.id, 1, 2, role_in_first.id)

    def test_raises_for_unknown_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        with pytest.raises(ChannelRoleNotFoundError):
            AssignRoleUseCase(repo).execute(channel.id, 1, 2, 999)

    def test_manage_roles_only_requester_cannot_assign_the_owner_role(self):
        """The exact escalation vector this change closes: holding only
        MANAGE_ROLES must not let you hand out the pre-existing, all-
        permissions Owner role to anyone -- including yourself."""
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        grant_role(repo, channel, 2, [PermissionCode.MANAGE_ROLES.value])
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        with pytest.raises(InsufficientPermissionsError):
            AssignRoleUseCase(repo).execute(channel.id, 2, 2, owner_role.id)

    def test_manage_roles_only_requester_cannot_assign_owner_role_to_someone_else(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        JoinChannelUseCase(repo).execute(channel.id, user_id=3)
        grant_role(repo, channel, 2, [PermissionCode.MANAGE_ROLES.value])
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        with pytest.raises(InsufficientPermissionsError):
            AssignRoleUseCase(repo).execute(channel.id, 2, 3, owner_role.id)

    def test_manage_roles_only_requester_cannot_assign_role_with_permissions_they_lack(
        self,
    ):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        grant_role(repo, channel, 2, [PermissionCode.MANAGE_ROLES.value])
        kick_role = CreateRoleUseCase(repo).execute(
            channel.id, 1, "Kicker", [PermissionCode.KICK_MEMBERS.value]
        )

        with pytest.raises(InsufficientPermissionsError):
            AssignRoleUseCase(repo).execute(channel.id, 2, 2, kick_role.id)

    def test_requester_holding_the_role_permissions_can_assign_it(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        grant_role(
            repo,
            channel,
            2,
            [PermissionCode.MANAGE_ROLES.value, PermissionCode.KICK_MEMBERS.value],
        )
        kick_role = CreateRoleUseCase(repo).execute(
            channel.id, 1, "Kicker", [PermissionCode.KICK_MEMBERS.value]
        )

        result = AssignRoleUseCase(repo).execute(channel.id, 2, 2, kick_role.id)

        assert result.role_id == kick_role.id


class TestRemoveRoleAssignmentUseCase:
    def test_unassigns_a_role_from_a_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        role = CreateRoleUseCase(repo).execute(
            channel.id, 1, "Moderator", [PermissionCode.KICK_MEMBERS.value]
        )
        AssignRoleUseCase(repo).execute(channel.id, 1, 2, role.id)

        RemoveRoleAssignmentUseCase(repo).execute(channel.id, user_id=2, role_id=role.id)

        assert PermissionCode.KICK_MEMBERS.value not in repo.get_user_permissions(
            channel.id, 2
        )

    def test_raises_for_non_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        role = CreateRoleUseCase(repo).execute(channel.id, 1, "Moderator", [])

        with pytest.raises(ChannelMemberNotFoundError):
            RemoveRoleAssignmentUseCase(repo).execute(
                channel.id, user_id=999, role_id=role.id
            )

    def test_raises_when_member_does_not_hold_that_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        role = CreateRoleUseCase(repo).execute(channel.id, 1, "Moderator", [])

        with pytest.raises(ChannelRoleNotFoundError):
            RemoveRoleAssignmentUseCase(repo).execute(
                channel.id, user_id=2, role_id=role.id
            )

    def test_cannot_remove_the_owner_role_assignment(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        with pytest.raises(OwnerRoleImmutableError):
            RemoveRoleAssignmentUseCase(repo).execute(
                channel.id, user_id=1, role_id=owner_role.id
            )


class TestGetUserPermissionsUnion:
    def test_zero_roles_returns_empty_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        DeleteRoleUseCase(repo).execute(
            repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME).id
        )

        assert repo.get_user_permissions(channel.id, 2) == []

    def test_one_role_returns_its_permissions(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        role = CreateRoleUseCase(repo).execute(
            channel.id, 1, "Moderator", [PermissionCode.KICK_MEMBERS.value]
        )
        AssignRoleUseCase(repo).execute(channel.id, 1, 2, role.id)
        DeleteRoleUseCase(repo).execute(
            repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME).id
        )

        assert set(repo.get_user_permissions(channel.id, 2)) == {
            PermissionCode.KICK_MEMBERS.value
        }

    def test_two_overlapping_roles_union_without_duplicates(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        role_a = CreateRoleUseCase(repo).execute(
            channel.id,
            1,
            "RoleA",
            [PermissionCode.KICK_MEMBERS.value, PermissionCode.SEND_MEDIA.value],
        )
        role_b = CreateRoleUseCase(repo).execute(
            channel.id,
            1,
            "RoleB",
            [PermissionCode.SEND_MEDIA.value, PermissionCode.DELETE_MESSAGES.value],
        )
        AssignRoleUseCase(repo).execute(channel.id, 1, 2, role_a.id)
        AssignRoleUseCase(repo).execute(channel.id, 1, 2, role_b.id)
        DeleteRoleUseCase(repo).execute(
            repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME).id
        )

        result = repo.get_user_permissions(channel.id, 2)

        assert sorted(result) == sorted(
            {
                PermissionCode.KICK_MEMBERS.value,
                PermissionCode.SEND_MEDIA.value,
                PermissionCode.DELETE_MESSAGES.value,
            }
        )
        assert len(result) == len(set(result))


class TestOwnerRolePermissionsAreLive:
    def test_get_role_always_returns_full_current_catalog(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)

        # Mutate the stored permissions directly (bypassing update_role,
        # which blocks Owner edits) to prove reads don't trust storage.
        repo._roles[owner_role.id].permissions = []

        refetched = repo.get_role(owner_role.id)
        assert refetched.permissions == [code.value for code in PermissionCode]

    def test_get_role_by_name_returns_full_current_catalog(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)
        repo._roles[owner_role.id].permissions = []

        refetched = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)
        assert refetched.permissions == [code.value for code in PermissionCode]

    def test_list_roles_returns_full_current_catalog_for_owner(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)
        repo._roles[owner_role.id].permissions = []

        roles = ListRolesUseCase(repo).execute(channel.id)

        owner_from_list = next(r for r in roles if r.name == OWNER_ROLE_NAME)
        assert owner_from_list.permissions == [code.value for code in PermissionCode]

    def test_get_user_permissions_reflects_live_owner_permissions(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        owner_role = repo.get_role_by_name(channel.id, OWNER_ROLE_NAME)
        repo._roles[owner_role.id].permissions = []

        assert set(repo.get_user_permissions(channel.id, 1)) == {
            code.value for code in PermissionCode
        }


class TestListMembersUseCase:
    def test_returns_all_members_of_the_channel(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)
        JoinChannelUseCase(repo).execute(channel.id, user_id=3)

        members = ListMembersUseCase(repo).execute(channel.id)

        assert {m.user_id for m in members} == {1, 2, 3}

    def test_returns_empty_list_for_channel_with_no_extra_members(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        repo.remove_member(channel.id, 1)

        members = ListMembersUseCase(repo).execute(channel.id)

        assert members == []

    def test_does_not_include_members_of_other_channels(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1, name="a")
        other = make_channel(repo, creator_id=9, name="b")
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        members = ListMembersUseCase(repo).execute(other.id)

        assert {m.user_id for m in members} == {9}


class TestListRolesUseCase:
    def test_returns_all_roles_for_the_channel(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        CreateRoleUseCase(repo).execute(channel.id, 1, "Moderator", [])

        roles = ListRolesUseCase(repo).execute(channel.id)

        assert {r.name for r in roles} == {
            OWNER_ROLE_NAME,
            EVERYONE_ROLE_NAME,
            "Moderator",
        }

    def test_returns_empty_list_when_channel_has_no_deletable_roles_left(self):
        """Owner is undeletable, so "no roles" in practice means "no roles
        other than Owner" -- assert list_roles reflects deletions and still
        surfaces the live Owner role."""
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        for role in list(ListRolesUseCase(repo).execute(channel.id)):
            if role.name == OWNER_ROLE_NAME:
                continue
            DeleteRoleUseCase(repo).execute(role.id)

        remaining = ListRolesUseCase(repo).execute(channel.id)
        assert {r.name for r in remaining} == {OWNER_ROLE_NAME}

    def test_does_not_include_roles_from_other_channels(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1, name="a")
        other = make_channel(repo, creator_id=1, name="b")
        CreateRoleUseCase(repo).execute(channel.id, 1, "OnlyInA", [])

        roles = ListRolesUseCase(repo).execute(other.id)

        assert "OnlyInA" not in {r.name for r in roles}


class TestUpdateMemberNicknameUseCase:
    def test_updates_and_persists_the_nickname(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        updated = UpdateMemberNicknameUseCase(repo).execute(channel.id, 2, "new-nick")

        assert updated.nickname_in_channel == "new-nick"
        assert (
            repo.list_members(channel.id)[
                [m.user_id for m in repo.list_members(channel.id)].index(2)
            ].nickname_in_channel
            == "new-nick"
        )

    def test_raises_for_non_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        with pytest.raises(ChannelMemberNotFoundError):
            UpdateMemberNicknameUseCase(repo).execute(channel.id, 999, "nick")


class TestKickMemberUseCaseOwnerProtection:
    def test_cannot_kick_the_channel_creator(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)

        with pytest.raises(CannotKickChannelOwnerError):
            KickMemberUseCase(repo).execute(channel.id, 1)

        assert repo.is_member(channel.id, 1)

    def test_can_still_kick_a_non_creator_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        KickMemberUseCase(repo).execute(channel.id, user_id=2)

        assert not repo.is_member(channel.id, 2)
