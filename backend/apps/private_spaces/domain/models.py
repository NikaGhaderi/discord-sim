"""Pure-Python domain entities for private_spaces. No Django/DRF imports here."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class DirectChatEntity:
    user1_id: int
    user2_id: int
    id: int | None = None
    created_at: datetime | None = None


@dataclass
class GroupEntity:
    name: str
    creator_id: int
    id: int | None = None
    created_at: datetime | None = None


@dataclass
class GroupInvitationEntity:
    group_id: int
    inviter_id: int
    invitee_id: int
    status: str
    id: int | None = None
    created_at: datetime | None = None


@dataclass
class GroupInvitationPage:
    count: int
    results: list[GroupInvitationEntity]
