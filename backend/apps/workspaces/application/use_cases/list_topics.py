from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import TopicEntity


class ListTopicsUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int) -> list[TopicEntity]:
        return self._repository.list_topics(channel_id)
