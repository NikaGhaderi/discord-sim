from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import TopicEntity


class CreateTopicUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, title: str) -> TopicEntity:
        # get_channel raises ChannelNotFoundError itself if channel_id is bad.
        self._repository.get_channel(channel_id)
        return self._repository.create_topic(channel_id, title)
