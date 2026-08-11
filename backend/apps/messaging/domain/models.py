"""Framework-independent entities for the Messaging Core."""

from dataclasses import dataclass, field
from datetime import datetime


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
    base_message_id: int
    sender_id: int
    content: str
    sent_at: datetime
    is_edited: bool
    topic_id: int | None = None
    group_id: int | None = None
    direct_chat_id: int | None = None
    media: list[MediaEntity] = field(default_factory=list)


@dataclass
class MessagePage:
    count: int
    results: list[MessageEntity]


@dataclass
class ScheduledMessageEntity:
    scheduled_id: int
    sender_id: int
    content: str
    scheduled_time: datetime
    topic_id: int | None = None
    group_id: int | None = None
    direct_chat_id: int | None = None
