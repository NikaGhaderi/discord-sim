from apps.workspaces.application.interfaces import AbstractChannelRepository


class CountActiveTopicsUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int) -> int:
        return self._repository.count_active_topics(channel_id)
