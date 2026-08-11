from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.domain.exceptions import (
    InvalidMessageTargetError,
    MessageTargetForbiddenError,
)
from apps.messaging.domain.models import MessageEntity


def validate_exactly_one_target(
    topic_id: int | None,
    group_id: int | None,
    direct_chat_id: int | None,
) -> None:
    targets = (topic_id, group_id, direct_chat_id)
    if sum(value is not None for value in targets) != 1:
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
            raise MessageTargetForbiddenError(
                "You are not a member of this message target."
            )
        return self._repository.create_message(
            sender_id,
            content,
            topic_id=topic_id,
            group_id=group_id,
            direct_chat_id=direct_chat_id,
        )
