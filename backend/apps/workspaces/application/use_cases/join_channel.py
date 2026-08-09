from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelMemberEntity
from apps.workspaces.domain.roles import EVERYONE_ROLE_NAME


class JoinChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(
        self, channel_id: int, user_id: int, nickname_in_channel: str = ""
    ) -> ChannelMemberEntity:
        # Raises ChannelNotFoundError if channel_id is bad.
        self._repository.get_channel(channel_id)

        member = self._repository.add_member(channel_id, user_id, nickname_in_channel)

        everyone_role = self._repository.get_role_by_name(
            channel_id, EVERYONE_ROLE_NAME
        )
        if everyone_role is not None:
            self._repository.assign_role(channel_id, user_id, everyone_role.id)

        return member
