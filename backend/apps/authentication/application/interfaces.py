from __future__ import annotations

from abc import ABC, abstractmethod

from apps.authentication.domain.models import UserEntity


class AbstractAuthRepository(ABC):
    """Port the use cases depend on; implemented by a Django-backed adapter."""

    @abstractmethod
    def get_by_username(self, username: str) -> UserEntity | None: ...

    @abstractmethod
    def get_by_id(self, user_id: int) -> UserEntity | None: ...

    @abstractmethod
    def get_by_email(self, email: str) -> UserEntity | None: ...

    @abstractmethod
    def save_user(self, user_entity: UserEntity) -> UserEntity: ...

    @abstractmethod
    def create_two_factor_challenge(self, user_id: int) -> tuple[str, str]:
        """Returns (code, temp_token)."""
        ...

    @abstractmethod
    def consume_two_factor_challenge(self, temp_token: str, code: str) -> int | None:
        """Returns the user_id on success, None if the token/code is wrong or
        expired."""
        ...

    @abstractmethod
    def blacklist_refresh_token(self, token: str, expires_at: float) -> None: ...

    @abstractmethod
    def is_refresh_token_blacklisted(self, token: str) -> bool: ...
