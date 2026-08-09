from apps.private_spaces.application.interfaces import AbstractPrivateSpacesRepository
from apps.private_spaces.domain.exceptions import (
    GroupMembershipNotFoundError,
    GroupNotFoundError,
)
from apps.private_spaces.domain.models import GroupEntity


class ListGroupsUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int) -> list[GroupEntity]:
        return self._repository.list_groups_for_user(user_id)


class CreateGroupUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int, name: str) -> GroupEntity:
        return self._repository.create_group_with_owner(name, creator_id=user_id)


class UpdateGroupUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int, name: str) -> GroupEntity:
        group = self._repository.get_group_for_member(group_id, user_id)
        if group is None:
            raise GroupNotFoundError("Group not found.")
        return self._repository.update_group(group_id, name)


class DeleteGroupUseCase:
    """Hard-deletes a whole group.

    Per the Phase 1 doc (§8-3-6), any member -- not just an admin -- may do
    this; SCRUM-26's "admin-only" acceptance criteria was superseded by that
    (see the comment on SCRUM-26).
    """

    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int) -> None:
        group = self._repository.get_group_for_member(group_id, user_id)
        if group is None:
            raise GroupNotFoundError("Group not found.")
        self._repository.delete_group(group_id)


class LeaveGroupUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int) -> None:
        removed = self._repository.remove_group_member(group_id, user_id)
        if not removed:
            raise GroupMembershipNotFoundError("Group membership not found.")
