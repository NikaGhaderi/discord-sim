from apps.workspaces.application.interfaces import AbstractChannelRepository


class DeleteChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int) -> None:
        return self._repository.delete_channel(channel_id)
