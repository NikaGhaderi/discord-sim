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


@dataclass
class ChannelMemberEntity:
    """Mirrors the CHANNEL_MEMBER table in the ERD."""

    channel_id: int
    user_id: int
    nickname_in_channel: str = ""
    id: int | None = None
    joined_at: datetime | None = None


@dataclass
class ChannelRoleEntity:
    """Mirrors the CHANNEL_ROLE table in the ERD."""

    channel_id: int
    name: str
    permissions: list[str]
    id: int | None = None


@dataclass
class UserChannelRoleEntity:
    """Mirrors the USER_ROLE table in the ERD."""

    channel_id: int
    user_id: int
    role_id: int
    id: int | None = None
    assigned_at: datetime | None = None
