from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelEntity


class CreateChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, name: str, creator_id: int) -> ChannelEntity:
        channel = self._repository.create_channel(name, creator_id)
        topic = self._repository.create_topic(channel.id, "general")
        return self._repository.set_default_topic(channel.id, topic.id)
