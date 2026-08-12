from abc import ABC, abstractmethod
from datetime import datetime
from typing import BinaryIO

from apps.messaging.domain.models import (
    MediaEntity,
    MessageEntity,
    MessagePage,
    ScheduledMessageEntity,
)


class AbstractMessagingRepository(ABC):
    @abstractmethod
    def can_access_target(
        self,
        user_id: int,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
    ) -> bool: ...

    @abstractmethod
    def create_message(
        self,
        sender_id: int,
        content: str,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
    ) -> MessageEntity: ...

    @abstractmethod
    def create_scheduled_message(
        self,
        sender_id: int,
        content: str,
        scheduled_time: datetime,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
    ) -> ScheduledMessageEntity: ...

    @abstractmethod
    def get_scheduled_message(
        self, scheduled_message_id: int
    ) -> ScheduledMessageEntity: ...

    @abstractmethod
    def delete_scheduled_message(self, scheduled_message_id: int) -> None: ...

    @abstractmethod
    def promote_scheduled_message(
        self, scheduled_message_id: int
    ) -> MessageEntity | None:
        """Atomically promotes an existing scheduled row, or returns None."""
        ...

    @abstractmethod
    def list_messages(
        self,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
        limit: int,
        offset: int,
    ) -> MessagePage: ...

    @abstractmethod
    def search_messages(
        self,
        query: str,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
        limit: int,
        offset: int,
    ) -> MessagePage: ...

    @abstractmethod
    def attach_media(
        self,
        base_message_id: int,
        uploaded_file: BinaryIO,
        file_type: str,
        file_size: int,
    ) -> MediaEntity: ...

    @abstractmethod
    def get_message(self, base_message_id: int) -> MessageEntity: ...

    @abstractmethod
    def write_message_edit(self, base_message_id: int, content: str) -> MessageEntity:
        """Transactionally records the old content to history, then updates
        the message. No authorization check -- the caller decides who's
        allowed to edit before calling this."""
        ...

    @abstractmethod
    def delete_message(self, base_message_id: int) -> None:
        """Unconditional hard delete. No authorization check -- the caller
        decides who's allowed to delete before calling this."""
        ...

    @abstractmethod
    def get_permissions_for_topic(self, topic_id: int, user_id: int) -> list[str]:
        """Raw permission fact-lookup (resolves topic -> channel internally).
        Does not decide anything -- callers apply has_permission() themselves."""
        ...

    @abstractmethod
    def is_group_admin(self, group_id: int, user_id: int) -> bool: ...

    @abstractmethod
    def list_target_member_ids(
        self,
        *,
        topic_id: int | None,
        group_id: int | None,
        direct_chat_id: int | None,
        user_id: int,
    ) -> list[int]:
        """Every other member of the target room -- the calling user's own
        id is always excluded, so callers get a ready-to-use recipient list."""
        ...


class AbstractRealtimeNotifier(ABC):
    @abstractmethod
    def notify(self, group_name: str, event_type: str, payload: dict) -> None: ...


class AbstractNotificationRecorder(ABC):
    @abstractmethod
    def record(
        self, recipient_ids: list[int], event_type: str, payload: dict
    ) -> None: ...


class AbstractScheduledMessageDispatcher(ABC):
    @abstractmethod
    def schedule(self, scheduled_message_id: int, eta: datetime) -> None: ...
