from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import TopicNotFoundError, LastTopicDeletionError


class DeleteTopicUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, topic_id: int) -> None:
        topic = self._repository.get_topic(topic_id)
        if topic is None:
            raise TopicNotFoundError("Topic not found.")
        if self._repository.count_active_topics(topic.channel_id) <= 1:
            raise LastTopicDeletionError("A channel must have at least one topic.")
        self._repository.delete_topic(topic_id)
