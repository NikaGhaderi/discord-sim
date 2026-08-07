from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelMemberEntity


class ListMembersUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int) -> list[ChannelMemberEntity]:
        return self._repository.list_members(channel_id)
