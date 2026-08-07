from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import (
    ChannelMemberNotFoundError,
    ChannelRoleNotFoundError,
)
from apps.workspaces.domain.models import UserChannelRoleEntity


class AssignRoleUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, channel_id: int, user_id: int, role_id: int
    ) -> UserChannelRoleEntity:
        if not self._repository.is_member(channel_id, user_id):
            raise ChannelMemberNotFoundError("User is not a member of this channel.")

        role = self._repository.get_role(role_id)
        if role.channel_id != channel_id:
            raise ChannelRoleNotFoundError("Role not found in this channel.")

        return self._repository.assign_role(channel_id, user_id, role_id)
