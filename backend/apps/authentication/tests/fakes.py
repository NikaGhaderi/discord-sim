from __future__ import annotations

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.models import UserEntity


class InMemoryAuthRepository(AbstractAuthRepository):
    """Test double — no Django ORM/DB access, keeps use-case tests fast and isolated."""

    def __init__(self) -> None:
        self._users_by_username: dict[str, UserEntity] = {}
        self._codes_by_user_id: dict[int, str] = {}
        self._next_id = 1

    def get_by_username(self, username: str) -> UserEntity | None:
        return self._users_by_username.get(username)

    def save_user(self, user_entity: UserEntity) -> UserEntity:
        user_entity.id = self._next_id
        self._next_id += 1
        self._users_by_username[user_entity.username] = user_entity
        return user_entity

    def store_2fa_code(self, user_id: int, code: str) -> None:
        self._codes_by_user_id[user_id] = code

    def verify_2fa_code(self, user_id: int, code: str) -> bool:
        return self._codes_by_user_id.get(user_id) == code
