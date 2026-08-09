from apps.permissions.domain.permissions import PermissionCode
from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.models import ChannelEntity
from apps.workspaces.domain.roles import EVERYONE_ROLE_NAME, OWNER_ROLE_NAME


class CreateChannelUseCase:
    def __init__(self, repository: AbstractChannelRepository) -> None:
        self._repository = repository

    def execute(self, creator_id: int, name: str) -> ChannelEntity:
        channel = self._repository.create_channel(name, creator_id)
        topic = self._repository.create_topic(channel.id, "general")
        channel = self._repository.set_default_topic(channel.id, topic.id)

        self._repository.add_member(channel.id, creator_id)
        self._repository.create_role(channel.id, EVERYONE_ROLE_NAME, [])
        owner_role = self._repository.create_role(
            channel.id, OWNER_ROLE_NAME, [code.value for code in PermissionCode]
        )
        self._repository.assign_role(channel.id, creator_id, owner_role.id)

        return channel
