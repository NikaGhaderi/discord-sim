from __future__ import annotations

import secrets

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.models import UserEntity


class InMemoryAuthRepository(AbstractAuthRepository):
    """Test double — no Django ORM/DB/Redis access, keeps use-case tests fast
    and isolated."""

    def __init__(self) -> None:
        self._users_by_username: dict[str, UserEntity] = {}
        self._users_by_id: dict[int, UserEntity] = {}
        self._users_by_email: dict[str, UserEntity] = {}
        self._challenges_by_temp_token: dict[str, tuple[int, str]] = {}
        self._blacklisted_tokens: set[str] = set()
        self._next_id = 1

    def get_by_username(self, username: str) -> UserEntity | None:
        return self._users_by_username.get(username)

    def get_by_id(self, user_id: int) -> UserEntity | None:
        return self._users_by_id.get(user_id)

    def get_by_email(self, email: str) -> UserEntity | None:
        return self._users_by_email.get(email)

    def save_user(self, user_entity: UserEntity) -> UserEntity:
        user_entity.id = self._next_id
        self._next_id += 1
        self._users_by_username[user_entity.username] = user_entity
        self._users_by_id[user_entity.id] = user_entity
        self._users_by_email[user_entity.email] = user_entity
        return user_entity

    def create_two_factor_challenge(self, user_id: int) -> tuple[str, str]:
        code = f"{secrets.randbelow(1_000_000):06d}"
        temp_token = secrets.token_urlsafe(16)
        self._challenges_by_temp_token[temp_token] = (user_id, code)
        return code, temp_token

    def consume_two_factor_challenge(self, temp_token: str, code: str) -> int | None:
        challenge = self._challenges_by_temp_token.get(temp_token)
        if challenge is None or challenge[1] != code:
            return None
        del self._challenges_by_temp_token[temp_token]  # one-time use
        return challenge[0]

    def blacklist_refresh_token(self, token: str, expires_at: float) -> None:
        self._blacklisted_tokens.add(token)

    def is_refresh_token_blacklisted(self, token: str) -> bool:
        return token in self._blacklisted_tokens
