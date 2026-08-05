from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import TopicNotFoundError
from apps.workspaces.domain.models import TopicEntity


class GetTopicUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, topic_id: int) -> TopicEntity:
        topic = self._repository.get_topic(topic_id)
        if topic is None:
            raise TopicNotFoundError("topic not found.")
        return topic
