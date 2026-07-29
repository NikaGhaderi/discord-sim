"""Pure-Python domain entities for authentication. No Django/DRF imports here."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class UserEntity:
    """Mirrors the USER table in the ERD, plus the 2FA flag this module owns."""

    username: str
    email: str
    password_hash: str
    id: int | None = None
    is_2fa_enabled: bool = False
    is_active: bool = True
    created_at: datetime | None = None
