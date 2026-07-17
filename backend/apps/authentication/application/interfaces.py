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
    def save_user(self, user_entity: UserEntity) -> UserEntity: ...

    @abstractmethod
    def store_2fa_code(self, user_id: int, code: str) -> None: ...

    @abstractmethod
    def verify_2fa_code(self, user_id: int, code: str) -> bool: ...

    @abstractmethod
    def blacklist_refresh_token(self, token: str) -> None: ...

    @abstractmethod
    def is_refresh_token_blacklisted(self, token: str) -> bool: ...
