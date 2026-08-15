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
    invite_token: str = ""


@dataclass
class GroupInvitationEntity:
    group_id: int
    inviter_id: int
    invitee_id: int
    status: str
    id: int | None = None
    created_at: datetime | None = None
    # Only populated by list_pending_invitations_for_user, which the invitee
    # (not yet a group member) uses to see what they're being invited to --
    # GetGroupUseCase requires membership, so it can't be used here instead.
    group_name: str | None = None


@dataclass
class GroupInvitationPage:
    count: int
    results: list[GroupInvitationEntity]


@dataclass
class GroupMemberEntity:
    user_id: int
    is_admin: bool
    joined_at: datetime | None = None
