from apps.permissions.domain.permissions import PermissionCode
from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import (
    AlreadyChannelMemberError,
    ChannelMemberNotFoundError,
    ChannelNotFoundError,
    ChannelRoleNotFoundError,
    DuplicateRoleNameError,
    OwnerRoleImmutableError,
    TopicNotFoundError,
)
from apps.workspaces.domain.models import (
    ChannelEntity,
    ChannelMemberEntity,
    ChannelRoleEntity,
    TopicEntity,
    UserChannelRoleEntity,
)
from apps.workspaces.domain.roles import OWNER_ROLE_NAME


def _live_role(role: ChannelRoleEntity) -> ChannelRoleEntity:
    """Mirrors DjangoChannelRepository: Owner's permissions are always the
    full, current catalog, not whatever was stored at creation time."""
    if role.name == OWNER_ROLE_NAME:
        return ChannelRoleEntity(
            id=role.id,
            channel_id=role.channel_id,
            name=role.name,
            permissions=[code.value for code in PermissionCode],
        )
    return role


class InMemoryChannelRepository(AbstractChannelRepository):
    """In-memory fake implementing AbstractChannelRepository for use-case tests."""

    def __init__(self):
        self._channels: dict[int, ChannelEntity] = {}
        self._topics: dict[int, TopicEntity] = {}
        self._members: dict[int, ChannelMemberEntity] = {}
        self._roles: dict[int, ChannelRoleEntity] = {}
        self._user_roles: dict[int, UserChannelRoleEntity] = {}
        self._next_channel_id = 1
        self._next_topic_id = 1
        self._next_member_id = 1
        self._next_role_id = 1
        self._next_user_role_id = 1
        self._invite_token_counter = 0

    # -- test setup helpers, not part of the interface --------------------

    def _next_invite_token(self) -> str:
        self._invite_token_counter += 1
        return f"token-{self._invite_token_counter}"

    # -- channels -----------------------------------------------------------

    def create_channel(self, name: str, creator_id: int) -> ChannelEntity:
        channel = ChannelEntity(
            id=self._next_channel_id,
            name=name,
            creator_id=creator_id,
            invite_token=self._next_invite_token(),
        )
        self._channels[channel.id] = channel
        self._next_channel_id += 1
        return channel

    def get_channel(self, channel_id: int) -> ChannelEntity:
        channel = self._channels.get(channel_id)
        if channel is None:
            raise ChannelNotFoundError("Channel not found.")
        return channel

    def get_channel_by_invite_token(self, invite_token: str) -> ChannelEntity:
        for channel in self._channels.values():
            if channel.invite_token == invite_token:
                return channel
        raise ChannelNotFoundError("Channel not found.")

    def get_topic(self, topic_id: int) -> TopicEntity:
        topic = self._topics.get(topic_id)
        if topic is None:
            raise TopicNotFoundError("Topic not found.")
        return topic

    def list_topics(self, channel_id: int) -> list[TopicEntity]:
        return [t for t in self._topics.values() if t.channel_id == channel_id]

    def list_channels_for_user(self, user_id: int) -> list[ChannelEntity]:
        member_channel_ids = {
            m.channel_id for m in self._members.values() if m.user_id == user_id
        }
        return [c for c in self._channels.values() if c.id in member_channel_ids]

    def update_channel(self, channel_id: int, name: str) -> ChannelEntity:
        channel = self.get_channel(channel_id)
        channel.name = name
        return channel

    def delete_channel(self, channel_id: int) -> None:
        self._channels.pop(channel_id, None)

    def create_topic(self, channel_id: int, title: str) -> TopicEntity:
        if channel_id not in self._channels:
            raise ChannelNotFoundError("Channel not found.")
        topic = TopicEntity(id=self._next_topic_id, title=title, channel_id=channel_id)
        self._topics[topic.id] = topic
        self._next_topic_id += 1
        return topic

    def delete_topic(self, topic_id: int) -> None:
        if topic_id not in self._topics:
            raise TopicNotFoundError("Topic not found.")
        self._topics.pop(topic_id, None)

    def count_active_topics(self, channel_id: int) -> int:
        return len([t for t in self._topics.values() if t.channel_id == channel_id])

    def set_default_topic(self, channel_id: int, topic_id: int) -> ChannelEntity:
        channel = self.get_channel(channel_id)
        channel.default_topic_id = topic_id
        return channel

    # -- membership -----------------------------------------------------------

    def add_member(
        self, channel_id: int, user_id: int, nickname_in_channel: str = ""
    ) -> ChannelMemberEntity:
        if any(
            m.channel_id == channel_id and m.user_id == user_id
            for m in self._members.values()
        ):
            raise AlreadyChannelMemberError("User is already a member of this channel.")
        member = ChannelMemberEntity(
            id=self._next_member_id,
            channel_id=channel_id,
            user_id=user_id,
            nickname_in_channel=nickname_in_channel,
        )
        self._members[member.id] = member
        self._next_member_id += 1
        return member

    def remove_member(self, channel_id: int, user_id: int) -> None:
        target_id = None
        for member_id, member in self._members.items():
            if member.channel_id == channel_id and member.user_id == user_id:
                target_id = member_id
                break
        if target_id is None:
            raise ChannelMemberNotFoundError("User is not a member of this channel.")
        del self._members[target_id]

        for user_role_id in [
            ur_id
            for ur_id, ur in self._user_roles.items()
            if ur.channel_id == channel_id and ur.user_id == user_id
        ]:
            del self._user_roles[user_role_id]

    def is_member(self, channel_id: int, user_id: int) -> bool:
        return any(
            m.channel_id == channel_id and m.user_id == user_id
            for m in self._members.values()
        )

    def list_members(self, channel_id: int) -> list[ChannelMemberEntity]:
        return [m for m in self._members.values() if m.channel_id == channel_id]

    def update_member_nickname(
        self, channel_id: int, user_id: int, nickname_in_channel: str
    ) -> ChannelMemberEntity:
        for member in self._members.values():
            if member.channel_id == channel_id and member.user_id == user_id:
                member.nickname_in_channel = nickname_in_channel
                return member
        raise ChannelMemberNotFoundError("User is not a member of this channel.")

    # -- roles -----------------------------------------------------------

    def create_role(
        self, channel_id: int, name: str, permissions: list[str]
    ) -> ChannelRoleEntity:
        if any(
            r.channel_id == channel_id and r.name == name for r in self._roles.values()
        ):
            raise DuplicateRoleNameError(f"Channel already has a role named '{name}'.")
        role = ChannelRoleEntity(
            id=self._next_role_id,
            channel_id=channel_id,
            name=name,
            permissions=list(permissions),
        )
        self._roles[role.id] = role
        self._next_role_id += 1
        return role

    def get_role(self, role_id: int) -> ChannelRoleEntity:
        role = self._roles.get(role_id)
        if role is None:
            raise ChannelRoleNotFoundError("Role not found.")
        return _live_role(role)

    def get_role_by_name(self, channel_id: int, name: str) -> ChannelRoleEntity | None:
        for role in self._roles.values():
            if role.channel_id == channel_id and role.name == name:
                return _live_role(role)
        return None

    def list_roles(self, channel_id: int) -> list[ChannelRoleEntity]:
        return [
            _live_role(r) for r in self._roles.values() if r.channel_id == channel_id
        ]

    def update_role(self, role_id: int, permissions: list[str]) -> ChannelRoleEntity:
        role = self._roles.get(role_id)
        if role is None:
            raise ChannelRoleNotFoundError("Role not found.")
        if role.name == OWNER_ROLE_NAME:
            raise OwnerRoleImmutableError("The Owner role cannot be edited.")
        role.permissions = list(permissions)
        return role

    def delete_role(self, role_id: int) -> None:
        role = self.get_role(role_id)
        if role.name == OWNER_ROLE_NAME:
            raise OwnerRoleImmutableError("The Owner role cannot be deleted.")
        del self._roles[role_id]

    def assign_role(
        self, channel_id: int, user_id: int, role_id: int
    ) -> UserChannelRoleEntity:
        for user_role in self._user_roles.values():
            if (
                user_role.channel_id == channel_id
                and user_role.user_id == user_id
                and user_role.role_id == role_id
            ):
                return user_role
        user_role = UserChannelRoleEntity(
            id=self._next_user_role_id,
            channel_id=channel_id,
            user_id=user_id,
            role_id=role_id,
        )
        self._user_roles[user_role.id] = user_role
        self._next_user_role_id += 1
        return user_role

    def list_role_assignments(self, channel_id: int) -> list[UserChannelRoleEntity]:
        return [ur for ur in self._user_roles.values() if ur.channel_id == channel_id]

    def remove_role_assignment(
        self, channel_id: int, user_id: int, role_id: int
    ) -> bool:
        for ur_id, ur in list(self._user_roles.items()):
            if (
                ur.channel_id == channel_id
                and ur.user_id == user_id
                and ur.role_id == role_id
            ):
                del self._user_roles[ur_id]
                return True
        return False

    def get_user_permissions(self, channel_id: int, user_id: int) -> list[str]:
        role_ids = {
            ur.role_id
            for ur in self._user_roles.values()
            if ur.channel_id == channel_id and ur.user_id == user_id
        }
        permissions: set[str] = set()
        for role_id in role_ids:
            role = self._roles.get(role_id)
            if role is not None:
                permissions.update(_live_role(role).permissions)
        return list(permissions)
