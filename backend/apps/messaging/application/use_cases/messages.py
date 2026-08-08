from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import (
    InvalidMessageTargetError,
    MessageTargetNotFoundError,
)
from apps.messaging.domain.models import MessageEntity, MessagePage


def validate_exactly_one_target(
    topic_id: int | None,
    group_id: int | None,
    direct_chat_id: int | None,
) -> None:
    if sum(value is not None for value in (topic_id, group_id, direct_chat_id)) != 1:
        raise InvalidMessageTargetError(
            "Exactly one of topic_id, group_id, or direct_chat_id must be set."
        )


class SendMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        sender_id: int,
        content: str,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
    ) -> MessageEntity:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if not self._repository.can_access_target(
            sender_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")
        return self._repository.create_message(
            sender_id,
            content,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        )


class ListMessagesUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        user_id: int,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> MessagePage:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if not self._repository.can_access_target(
            user_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")
        return self._repository.list_messages(
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
            limit=limit,
            offset=offset,
        )


class SearchMessagesUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self,
        user_id: int,
        query: str,
        *,
        topic_id: int | None = None,
        group_id: int | None = None,
        direct_chat_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> MessagePage:
        validate_exactly_one_target(topic_id, group_id, direct_chat_id)
        if not self._repository.can_access_target(
            user_id,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        ):
            raise MessageTargetNotFoundError("Message target not found.")
        return self._repository.search_messages(
            query,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
            limit=limit,
            offset=offset,
        )


class EditMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(
        self, base_message_id: int, user_id: int, content: str
    ) -> MessageEntity:
        return self._repository.edit_message_transactionally(
            base_message_id, user_id, content
        )


class DeleteMessageUseCase:
    def __init__(self, repository: AbstractMessagingRepository) -> None:
        self._repository = repository

    def execute(self, base_message_id: int, user_id: int) -> None:
        self._repository.delete_message(base_message_id, user_id)
