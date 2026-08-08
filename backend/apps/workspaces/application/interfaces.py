from __future__ import annotations

from abc import ABC, abstractmethod

from apps.workspaces.domain.models import (
    ChannelEntity,
    ChannelMemberEntity,
    ChannelRoleEntity,
    TopicEntity,
    UserChannelRoleEntity,
)


class AbstractChannelRepository(ABC):
    """Port the use cases depend on; implemented by a Django-backed adapter."""

    @abstractmethod
    def create_channel(self, name: str, creator_id: int) -> ChannelEntity: ...

    @abstractmethod
    def get_channel(self, channel_id: int) -> ChannelEntity:
        """Raises ChannelNotFoundError if channel_id doesn't exist."""

    @abstractmethod
    def get_channel_by_invite_token(self, invite_token: str) -> ChannelEntity:
        """Raises ChannelNotFoundError if invite_token doesn't match any channel."""

    @abstractmethod
    def get_topic(self, topic_id: int) -> TopicEntity:
        """Raises TopicNotFoundError if topic_id doesn't exist."""

    @abstractmethod
    def list_channels_for_user(self, user_id: int) -> list[ChannelEntity]: ...

    @abstractmethod
    def update_channel(self, channel_id: int, name: str) -> ChannelEntity: ...

    @abstractmethod
    def delete_channel(self, channel_id: int) -> None: ...

    @abstractmethod
    def create_topic(self, channel_id: int, title: str) -> TopicEntity: ...

    @abstractmethod
    def list_topics(self, channel_id: int) -> list[TopicEntity]: ...

    @abstractmethod
    def delete_topic(self, topic_id: int) -> None: ...

    @abstractmethod
    def count_active_topics(self, channel_id: int) -> int: ...

    @abstractmethod
    def set_default_topic(self, channel_id: int, topic_id: int) -> ChannelEntity: ...

    # -- Membership --

    @abstractmethod
    def add_member(
        self, channel_id: int, user_id: int, nickname_in_channel: str = ""
    ) -> ChannelMemberEntity:
        """Raises AlreadyChannelMemberError if user_id is already a member."""

    @abstractmethod
    def remove_member(self, channel_id: int, user_id: int) -> None:
        """Raises ChannelMemberNotFoundError if user_id isn't a member."""

    @abstractmethod
    def is_member(self, channel_id: int, user_id: int) -> bool: ...

    @abstractmethod
    def list_members(self, channel_id: int) -> list[ChannelMemberEntity]: ...

    @abstractmethod
    def update_member_nickname(
        self, channel_id: int, user_id: int, nickname_in_channel: str
    ) -> ChannelMemberEntity:
        """Raises ChannelMemberNotFoundError if user_id isn't a member."""

    # -- Roles --

    @abstractmethod
    def create_role(
        self, channel_id: int, name: str, permissions: list[str]
    ) -> ChannelRoleEntity:
        """Raises DuplicateRoleNameError if the channel already has this role name."""

    @abstractmethod
    def get_role(self, role_id: int) -> ChannelRoleEntity:
        """Raises ChannelRoleNotFoundError if role_id doesn't exist."""

    @abstractmethod
    def list_roles(self, channel_id: int) -> list[ChannelRoleEntity]: ...

    @abstractmethod
    def get_role_by_name(
        self, channel_id: int, name: str
    ) -> ChannelRoleEntity | None: ...

    @abstractmethod
    def update_role(self, role_id: int, permissions: list[str]) -> ChannelRoleEntity:
        """Raises ChannelRoleNotFoundError or OwnerRoleImmutableError."""

    @abstractmethod
    def delete_role(self, role_id: int) -> None:
        """Raises ChannelRoleNotFoundError or OwnerRoleImmutableError."""

    @abstractmethod
    def assign_role(
        self, channel_id: int, user_id: int, role_id: int
    ) -> UserChannelRoleEntity: ...

    @abstractmethod
    def get_user_permissions(self, channel_id: int, user_id: int) -> list[str]:
        """Union of permissions from every role assigned to user_id in channel_id."""
