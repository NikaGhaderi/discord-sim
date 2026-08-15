from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelRoleEntity
from apps.workspaces.domain.permission_validation import (
    ensure_permissions_subset,
    validate_permission_codes,
)


class UpdateRoleUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, role_id: int, requester_id: int, permissions: list[str]
    ) -> ChannelRoleEntity:
        validate_permission_codes(permissions)
        role = self._repository.get_role(role_id)
        granted = self._repository.get_user_permissions(role.channel_id, requester_id)
        ensure_permissions_subset(permissions, granted)
        return self._repository.update_role(role_id, permissions)
