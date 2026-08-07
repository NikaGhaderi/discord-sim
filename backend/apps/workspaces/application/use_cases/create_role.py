from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelRoleEntity
from apps.workspaces.domain.permission_validation import validate_permission_codes


class CreateRoleUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, channel_id: int, name: str, permissions: list[str]
    ) -> ChannelRoleEntity:
        validate_permission_codes(permissions)
        return self._repository.create_role(channel_id, name, permissions)
