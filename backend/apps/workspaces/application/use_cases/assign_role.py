from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import (
    ChannelMemberNotFoundError,
    ChannelRoleNotFoundError,
)
from apps.workspaces.domain.models import UserChannelRoleEntity
from apps.workspaces.domain.permission_validation import ensure_permissions_subset


class AssignRoleUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, channel_id: int, requester_id: int, user_id: int, role_id: int
    ) -> UserChannelRoleEntity:
        if not self._repository.is_member(channel_id, user_id):
            raise ChannelMemberNotFoundError("User is not a member of this channel.")

        role = self._repository.get_role(role_id)
        if role.channel_id != channel_id:
            raise ChannelRoleNotFoundError("Role not found in this channel.")

        # You can't hand out a role with more power than you hold yourself --
        # otherwise MANAGE_ROLES alone lets you assign the (pre-existing,
        # all-permissions) Owner role to yourself without ever creating it.
        granted = self._repository.get_user_permissions(channel_id, requester_id)
        ensure_permissions_subset(role.permissions, granted)

        return self._repository.assign_role(channel_id, user_id, role_id)
