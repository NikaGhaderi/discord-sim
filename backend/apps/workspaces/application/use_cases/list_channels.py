from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelEntity


class ListChannelsUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int) -> list[ChannelEntity]:
        return self._repository.list_channels_for_user(user_id)
