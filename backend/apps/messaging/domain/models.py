"""Framework-independent entities for the Messaging Core."""

from dataclasses import dataclass, field
from datetime import datetime

from apps.messaging.domain.exceptions import InvalidMessageTargetError


def validate_exactly_one_target(
    topic_id: int | None,
    group_id: int | None,
    direct_chat_id: int | None,
) -> None:
    """Enforce the message target invariant without depending on Django."""
    if (
        sum(target_id is not None for target_id in (topic_id, group_id, direct_chat_id))
        != 1
    ):
        raise InvalidMessageTargetError(
            "Exactly one of topic_id, group_id, or direct_chat_id must be set."
        )


@dataclass
class MediaEntity:
    media_id: int
    base_message_id: int
    file_url: str
    file_type: str
    file_size: int
    thumbnail_url: str | None = None


@dataclass
class MessageEntity:
    id: int
    sender_id: int
    topic_id: int | None
    group_id: int | None
    direct_chat_id: int | None
    body: str
    is_edited: bool
    created_at: datetime

    def __post_init__(self) -> None:
        validate_exactly_one_target(
            self.topic_id,
            self.group_id,
            self.direct_chat_id,
        )


@dataclass
class MessageDetailEntity(MessageEntity):
    """Read model used by the existing API to include attached media."""

    media: list[MediaEntity] = field(default_factory=list)


@dataclass
class MessagePage:
    count: int
    results: list[MessageDetailEntity]
