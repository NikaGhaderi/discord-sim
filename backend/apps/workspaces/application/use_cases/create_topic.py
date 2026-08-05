from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import ChannelNotFoundError
from apps.workspaces.domain.models import TopicEntity


class CreateTopicUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, title: str) -> TopicEntity:
        if self._repository.get_channel(channel_id=channel_id) is None:
            raise ChannelNotFoundError("The channel does not exist.")
        return self._repository.create_topic(channel_id, title)
