from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import CannotKickChannelOwnerError


class KickMemberUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, user_id: int) -> None:
        channel = self._repository.get_channel(channel_id)
        if channel.creator_id == user_id:
            raise CannotKickChannelOwnerError("The channel creator cannot be kicked.")

        # Raises ChannelMemberNotFoundError if user_id isn't a member --
        # unlike leaving, kicking someone who isn't there is a real error.
        self._repository.remove_member(channel_id, user_id)
