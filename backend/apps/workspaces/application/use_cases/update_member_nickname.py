from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelMemberEntity


class UpdateMemberNicknameUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, channel_id: int, user_id: int, nickname_in_channel: str
    ) -> ChannelMemberEntity:
        # Raises ChannelMemberNotFoundError if user_id isn't a member.
        return self._repository.update_member_nickname(
            channel_id, user_id, nickname_in_channel
        )
