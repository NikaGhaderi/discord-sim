from __future__ import annotations

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.models import UserEntity


class InMemoryAuthRepository(AbstractAuthRepository):
    """Test double — no Django ORM/DB access, keeps use-case tests fast and isolated."""

    def __init__(self) -> None:
        self._users_by_username: dict[str, UserEntity] = {}
        self._users_by_id: dict[int, UserEntity] = {}
        self._codes_by_user_id: dict[int, str] = {}
        self._blacklisted_tokens: set[str] = set()
        self._next_id = 1

    def get_by_username(self, username: str) -> UserEntity | None:
        return self._users_by_username.get(username)

    def get_by_id(self, user_id: int) -> UserEntity | None:
        return self._users_by_id.get(user_id)

    def save_user(self, user_entity: UserEntity) -> UserEntity:
        user_entity.id = self._next_id
        self._next_id += 1
        self._users_by_username[user_entity.username] = user_entity
        self._users_by_id[user_entity.id] = user_entity
        return user_entity

    def store_2fa_code(self, user_id: int, code: str) -> None:
        self._codes_by_user_id[user_id] = code

    def verify_2fa_code(self, user_id: int, code: str) -> bool:
        if self._codes_by_user_id.get(user_id) != code:
            return False
        del self._codes_by_user_id[user_id]  # one-time use
        return True

    def blacklist_refresh_token(self, token: str) -> None:
        self._blacklisted_tokens.add(token)

    def is_refresh_token_blacklisted(self, token: str) -> bool:
        return token in self._blacklisted_tokens
