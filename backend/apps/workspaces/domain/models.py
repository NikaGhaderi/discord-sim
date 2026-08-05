"""Pure-Python domain entities for workspaces. No Django/DRF imports here."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class ChannelEntity:
    """Mirrors the CHANNEL table in the ERD."""

    name: str
    creator_id: int
    invite_token: str
    default_topic_id: int | None = None
    id: int | None = None
    created_at: datetime | None = None


@dataclass
class TopicEntity:
    """Mirrors the TOPIC table in the ERD."""

    title: str
    channel_id: int
    id: int | None = None
    created_at: datetime | None = None
