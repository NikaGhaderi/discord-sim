from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import ChannelMemberNotFoundError


class LeaveChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, channel_id: int, user_id: int) -> None:
        # Idempotent: leaving a channel you're not (or no longer) a member of
        # is a no-op, not an error.
        try:
            self._repository.remove_member(channel_id, user_id)
        except ChannelMemberNotFoundError:
            pass
