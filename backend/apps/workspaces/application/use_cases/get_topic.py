from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import TopicEntity


class GetTopicUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, topic_id: int) -> TopicEntity:
        return self._repository.get_topic(topic_id)
