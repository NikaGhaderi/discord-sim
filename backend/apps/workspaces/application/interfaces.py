from __future__ import annotations

from abc import ABC, abstractmethod

from apps.workspaces.domain.models import ChannelEntity, TopicEntity


class AbstractChannelRepository(ABC):
    """Port the use cases depend on; implemented by a Django-backed adapter."""

    @abstractmethod
    def create_channel(self, name: str, creator_id: int) -> ChannelEntity: ...

    @abstractmethod
    def get_channel(self, channel_id: int) -> ChannelEntity | None: ...

    @abstractmethod
    def get_topic(self, topic_id: int) -> TopicEntity | None: ...

    @abstractmethod
    def list_channels_for_user(self, user_id: int) -> list[ChannelEntity]: ...

    @abstractmethod
    def update_channel(self, channel_id: int, name: str) -> ChannelEntity: ...

    @abstractmethod
    def delete_channel(self, channel_id: int) -> None: ...

    @abstractmethod
    def create_topic(self, channel_id: int, title: str) -> TopicEntity: ...

    @abstractmethod
    def delete_topic(self, topic_id: int) -> None: ...

    @abstractmethod
    def count_active_topics(self, channel_id: int) -> int: ...

    @abstractmethod
    def set_default_topic(self, channel_id: int, topic_id: int) -> ChannelEntity: ...
