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
from apps.workspaces.domain.exceptions import (
    AlreadyChannelMemberError,
    ChannelMemberNotFoundError,
    ChannelNotFoundError,
    ChannelRoleNotFoundError,
    DuplicateRoleNameError,
    InvalidPermissionCodeError,
    LastTopicDeletionError,
    OwnerRoleImmutableError,
    TopicNotFoundError,
)
from apps.workspaces.domain.roles import EVERYONE_ROLE_NAME, OWNER_ROLE_NAME
from apps.workspaces.tests.fakes import InMemoryChannelRepository


def make_channel(repo, creator_id=1, name="general-chat"):
    return CreateChannelUseCase(repo).execute(creator_id=creator_id, name=name)


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

    def test_creates_empty_everyone_role(self):
        repo = InMemoryChannelRepository()

        channel = make_channel(repo)

        everyone_role = repo.get_role_by_name(channel.id, EVERYONE_ROLE_NAME)
        assert everyone_role is not None
        assert everyone_role.permissions == []

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
            everyone_role.id, [PermissionCode.SEND_MEDIA.value]
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
            channel.id, "Moderator", [PermissionCode.KICK_MEMBERS.value]
        )

        assert role.name == "Moderator"
        assert role.permissions == [PermissionCode.KICK_MEMBERS.value]

    def test_rejects_fully_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        with pytest.raises(InvalidPermissionCodeError):
            CreateRoleUseCase(repo).execute(channel.id, "Bad", ["NOT_REAL", "ALSO_BAD"])

    def test_rejects_partially_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)

        with pytest.raises(InvalidPermissionCodeError):
            CreateRoleUseCase(repo).execute(
                channel.id,
                "Mixed",
                [PermissionCode.KICK_MEMBERS.value, "NOT_REAL"],
            )

    def test_duplicate_role_name_in_same_channel_raises(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

        with pytest.raises(DuplicateRoleNameError):
            CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

    def test_same_role_name_allowed_in_different_channels(self):
        repo = InMemoryChannelRepository()
        first = make_channel(repo, creator_id=1, name="a")
        second = make_channel(repo, creator_id=1, name="b")
        CreateRoleUseCase(repo).execute(first.id, "Moderator", [])

        role = CreateRoleUseCase(repo).execute(second.id, "Moderator", [])

        assert role.channel_id == second.id


class TestUpdateRoleUseCase:
    def test_updates_permissions(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

        updated = UpdateRoleUseCase(repo).execute(
            role.id, [PermissionCode.DELETE_MESSAGES.value]
        )

        assert updated.permissions == [PermissionCode.DELETE_MESSAGES.value]

    def test_rejects_fully_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

        with pytest.raises(InvalidPermissionCodeError):
            UpdateRoleUseCase(repo).execute(role.id, ["NOT_REAL"])

    def test_rejects_partially_invalid_permission_list(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo)
        role = CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

        with pytest.raises(InvalidPermissionCodeError):
            UpdateRoleUseCase(repo).execute(
                role.id, [PermissionCode.KICK_MEMBERS.value, "NOT_REAL"]
            )

    def test_raises_for_unknown_role(self):
        repo = InMemoryChannelRepository()

        with pytest.raises(ChannelRoleNotFoundError):
            UpdateRoleUseCase(repo).execute(999, [])


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
        role = CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

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
            channel.id, "Moderator", [PermissionCode.KICK_MEMBERS.value]
        )

        AssignRoleUseCase(repo).execute(channel.id, 2, role.id)

        assert PermissionCode.KICK_MEMBERS.value in repo.get_user_permissions(
            channel.id, 2
        )

    def test_raises_for_non_member(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        role = CreateRoleUseCase(repo).execute(channel.id, "Moderator", [])

        with pytest.raises(ChannelMemberNotFoundError):
            AssignRoleUseCase(repo).execute(channel.id, 999, role.id)

    def test_raises_for_role_belonging_to_a_different_channel(self):
        repo = InMemoryChannelRepository()
        first = make_channel(repo, creator_id=1, name="a")
        second = make_channel(repo, creator_id=1, name="b")
        JoinChannelUseCase(repo).execute(second.id, user_id=2)
        role_in_first = CreateRoleUseCase(repo).execute(first.id, "Moderator", [])

        with pytest.raises(ChannelRoleNotFoundError):
            AssignRoleUseCase(repo).execute(second.id, 2, role_in_first.id)

    def test_raises_for_unknown_role(self):
        repo = InMemoryChannelRepository()
        channel = make_channel(repo, creator_id=1)
        JoinChannelUseCase(repo).execute(channel.id, user_id=2)

        with pytest.raises(ChannelRoleNotFoundError):
            AssignRoleUseCase(repo).execute(channel.id, 2, 999)


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
            channel.id, "Moderator", [PermissionCode.KICK_MEMBERS.value]
        )
        AssignRoleUseCase(repo).execute(channel.id, 2, role.id)
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
            "RoleA",
            [PermissionCode.KICK_MEMBERS.value, PermissionCode.SEND_MEDIA.value],
        )
        role_b = CreateRoleUseCase(repo).execute(
            channel.id,
            "RoleB",
            [PermissionCode.SEND_MEDIA.value, PermissionCode.DELETE_MESSAGES.value],
        )
        AssignRoleUseCase(repo).execute(channel.id, 2, role_a.id)
        AssignRoleUseCase(repo).execute(channel.id, 2, role_b.id)
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
