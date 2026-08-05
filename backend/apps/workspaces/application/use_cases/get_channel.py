from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import ChannelNotFoundError
from apps.workspaces.domain.models import ChannelEntity


class GetChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int) -> ChannelEntity:
        channel = self._repository.get_channel(channel_id)
        if channel is None:
            raise ChannelNotFoundError("Channel not found.")
        return channel
