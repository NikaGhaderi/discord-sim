from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.application.use_cases.delete_message import DeleteMessageUseCase
from apps.messaging.application.use_cases.edit_message import EditMessageUseCase
from apps.messaging.application.use_cases.list_messages import ListMessagesUseCase
from apps.messaging.application.use_cases.send_message import SendMessageUseCase
from apps.messaging.domain.exceptions import MessageTargetNotFoundError
from apps.messaging.domain.models import MessagePage, validate_exactly_one_target


__all__ = [
    "DeleteMessageUseCase",
    "EditMessageUseCase",
    "ListMessagesUseCase",
    "SearchMessagesUseCase",
    "SendMessageUseCase",
    "validate_exactly_one_target",
]


# Send/list/edit/delete live in their own SCRUM-38/SCRUM-39 modules. These
# imports deliberately keep the previous public import path working for
# callers added during SCRUM-37.


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
