from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import (
    ChannelMemberNotFoundError,
    ChannelRoleNotFoundError,
    OwnerRoleImmutableError,
)
from apps.workspaces.domain.roles import OWNER_ROLE_NAME


class RemoveRoleAssignmentUseCase:
    """Unassigns a role from a member -- the inverse of AssignRoleUseCase.
    Not in the Phase 1 doc's contract, but there was previously no way for
    an admin to revoke a role once granted, only add more."""

    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, user_id: int, role_id: int) -> None:
        if not self._repository.is_member(channel_id, user_id):
            raise ChannelMemberNotFoundError("User is not a member of this channel.")

        role = self._repository.get_role(role_id)
        if role.channel_id != channel_id:
            raise ChannelRoleNotFoundError("Role not found in this channel.")
        if role.name == OWNER_ROLE_NAME:
            raise OwnerRoleImmutableError("The Owner role assignment cannot be removed.")

        removed = self._repository.remove_role_assignment(channel_id, user_id, role_id)
        if not removed:
            raise ChannelRoleNotFoundError("This member does not hold that role.")
