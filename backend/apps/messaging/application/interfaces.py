from abc import ABC, abstractmethod
from typing import BinaryIO

from apps.messaging.domain.models import MediaEntity, MessageEntity, MessagePage


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
    def can_attach_media(self, base_message_id: int, user_id: int) -> bool: ...

    @abstractmethod
    def edit_message_transactionally(
        self, base_message_id: int, user_id: int, content: str
    ) -> MessageEntity: ...

    @abstractmethod
    def delete_message(self, base_message_id: int, user_id: int) -> None: ...
