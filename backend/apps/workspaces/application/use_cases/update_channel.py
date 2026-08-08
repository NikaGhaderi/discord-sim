from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelEntity


class UpdateChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, name: str) -> ChannelEntity:
        return self._repository.update_channel(channel_id, name)
