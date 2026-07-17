from __future__ import annotations

from abc import ABC, abstractmethod

from apps.authentication.domain.models import UserEntity


class AbstractAuthRepository(ABC):
    """Port the use cases depend on; implemented by a Django-backed adapter."""

    @abstractmethod
    def get_by_username(self, username: str) -> UserEntity | None: ...

    @abstractmethod
    def save_user(self, user_entity: UserEntity) -> UserEntity: ...

    @abstractmethod
    def store_2fa_code(self, user_id: int, code: str) -> None: ...

    @abstractmethod
    def verify_2fa_code(self, user_id: int, code: str) -> bool: ...
