import pytest

from apps.private_spaces.application.use_cases.groups import (
    CreateGroupUseCase,
    DeleteGroupUseCase,
    GetGroupUseCase,
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


class TestListGroupsUseCase:
    def test_lists_only_the_users_groups(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "A", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_group(2, "B", creator_id=20)
        repo.seed_membership(2, 20)

        result = ListGroupsUseCase(repo).execute(user_id=10)

        assert [g.id for g in result] == [1]
