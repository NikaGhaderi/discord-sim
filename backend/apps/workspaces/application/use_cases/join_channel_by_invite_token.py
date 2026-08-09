from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.application.use_cases.join_channel import JoinChannelUseCase
from apps.workspaces.domain.models import ChannelMemberEntity


class JoinChannelByInviteTokenUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, invite_token: str, user_id: int, nickname_in_channel: str = ""
    ) -> ChannelMemberEntity:
        # Raises ChannelNotFoundError if invite_token doesn't match any channel.
        channel = self._repository.get_channel_by_invite_token(invite_token)
        return JoinChannelUseCase(self._repository).execute(
            channel.id, user_id, nickname_in_channel
        )
