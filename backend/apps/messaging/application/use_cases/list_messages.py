from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import MessageTargetNotFoundError
from apps.messaging.domain.models import MessagePage, validate_exactly_one_target


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
