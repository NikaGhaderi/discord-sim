from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelRoleEntity


class ListRolesUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int) -> list[ChannelRoleEntity]:
        return self._repository.list_roles(channel_id)
