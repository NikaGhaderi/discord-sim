from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelRoleEntity
from apps.workspaces.domain.permission_validation import validate_permission_codes


class UpdateRoleUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, role_id: int, permissions: list[str]) -> ChannelRoleEntity:
        validate_permission_codes(permissions)
        return self._repository.update_role(role_id, permissions)
