from unittest.mock import Mock

import pytest

from apps.private_spaces.application.use_cases.groups import (
    CreateGroupUseCase,
    DeleteGroupUseCase,
    GetGroupUseCase,
    JoinGroupByInviteTokenUseCase,
    LeaveGroupUseCase,
    ListGroupMembersUseCase,
    ListGroupsUseCase,
    UpdateGroupUseCase,
)
from apps.private_spaces.domain.exceptions import (
    GroupMembershipNotFoundError,
    GroupNotFoundError,
)
from apps.private_spaces.tests.fakes import InMemoryPrivateSpacesRepository


class TestCreateGroupUseCase:
    def test_creates_group_and_makes_creator_a_member(self):
        repo = InMemoryPrivateSpacesRepository()

        group = CreateGroupUseCase(repo).execute(user_id=1, name="Weekend CTF")

        assert group.name == "Weekend CTF"
        assert group.creator_id == 1
        assert repo.is_group_member(group.id, 1) is True


class TestGetGroupUseCase:
    def test_member_can_fetch_group_detail(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)

        group = GetGroupUseCase(repo).execute(group_id=1, user_id=10)

        assert group.name == "Original"

    def test_non_member_gets_not_found(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)

        with pytest.raises(GroupNotFoundError):
            GetGroupUseCase(repo).execute(group_id=1, user_id=999)

    def test_unknown_group_gets_not_found(self):
        repo = InMemoryPrivateSpacesRepository()

        with pytest.raises(GroupNotFoundError):
            GetGroupUseCase(repo).execute(group_id=999, user_id=10)


class TestListGroupMembersUseCase:
    def test_member_can_list_members_with_admin_flag(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_membership(1, 20)

        members = ListGroupMembersUseCase(repo).execute(group_id=1, user_id=20)

        by_id = {m.user_id: m for m in members}
        assert set(by_id) == {10, 20}
        assert by_id[10].is_admin is True
        assert by_id[20].is_admin is False

    def test_non_member_gets_not_found(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)

        with pytest.raises(GroupNotFoundError):
            ListGroupMembersUseCase(repo).execute(group_id=1, user_id=999)

    def test_unknown_group_gets_not_found(self):
        repo = InMemoryPrivateSpacesRepository()

        with pytest.raises(GroupNotFoundError):
            ListGroupMembersUseCase(repo).execute(group_id=999, user_id=10)


class TestUpdateGroupUseCase:
    def test_any_member_can_edit(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_membership(1, 20)  # non-admin member

        updated = UpdateGroupUseCase(repo).execute(group_id=1, user_id=20, name="New")

        assert updated.name == "New"

    def test_non_member_cannot_edit(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)

        with pytest.raises(GroupNotFoundError):
            UpdateGroupUseCase(repo).execute(group_id=1, user_id=999, name="New")


class TestDeleteGroupUseCase:
    def test_any_member_can_delete_the_whole_group(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_membership(1, 20)

        DeleteGroupUseCase(repo).execute(group_id=1, user_id=20)

        assert repo.get_group_for_member(1, 10) is None

    def test_non_member_cannot_delete(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)

        with pytest.raises(GroupNotFoundError):
            DeleteGroupUseCase(repo).execute(group_id=1, user_id=999)


class TestLeaveGroupUseCase:
    def test_member_can_leave(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_membership(1, 20)

        LeaveGroupUseCase(repo).execute(group_id=1, user_id=20)

        assert repo.is_group_member(1, 20) is False

    def test_non_member_cannot_leave(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)

        with pytest.raises(GroupMembershipNotFoundError):
            LeaveGroupUseCase(repo).execute(group_id=1, user_id=999)

    def test_notifies_remaining_members(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_membership(1, 20)
        repo.seed_membership(1, 30)
        recorder = Mock()

        LeaveGroupUseCase(repo, recorder).execute(group_id=1, user_id=20)

        recorder.record.assert_called_once_with(
            [10, 30], "MEMBER_LEFT", {"group_id": 1, "user_id": 20}
        )

    def test_does_not_notify_when_no_members_remain(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10)
        repo.seed_membership(1, 10)
        recorder = Mock()

        LeaveGroupUseCase(repo, recorder).execute(group_id=1, user_id=10)

        recorder.record.assert_not_called()


class TestJoinGroupByInviteTokenUseCase:
    def test_joins_the_group_matching_the_token(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10, invite_token="tok-1")
        repo.seed_membership(1, 10)

        group = JoinGroupByInviteTokenUseCase(repo).execute(
            invite_token="tok-1", user_id=20
        )

        assert group.id == 1
        assert repo.is_group_member(1, 20) is True

    def test_lets_a_user_join_even_when_they_have_group_invitations_disabled(self):
        # The whole point of an invite link: it bypasses the by-username
        # invite flow (and with it, allow_group_invitations) entirely, the
        # same way a channel invite link doesn't check any such flag.
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Original", creator_id=10, invite_token="tok-1")
        repo.seed_membership(1, 10)

        group = JoinGroupByInviteTokenUseCase(repo).execute(
            invite_token="tok-1", user_id=20
        )

        assert repo.is_group_member(group.id, 20) is True

    def test_unknown_token_gets_not_found(self):
        repo = InMemoryPrivateSpacesRepository()

        with pytest.raises(GroupNotFoundError):
            JoinGroupByInviteTokenUseCase(repo).execute(
                invite_token="bogus", user_id=20
            )


class TestListGroupsUseCase:
    def test_lists_only_the_users_groups(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "A", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_group(2, "B", creator_id=20)
        repo.seed_membership(2, 20)

        result = ListGroupsUseCase(repo).execute(user_id=10)

        assert [g.id for g in result] == [1]
