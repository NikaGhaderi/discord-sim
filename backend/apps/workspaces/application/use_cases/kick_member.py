from apps.workspaces.application.interfaces import AbstractChannelRepository


class KickMemberUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, user_id: int) -> None:
        # Raises ChannelMemberNotFoundError if user_id isn't a member --
        # unlike leaving, kicking someone who isn't there is a real error.
        self._repository.remove_member(channel_id, user_id)
