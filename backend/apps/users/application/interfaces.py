from abc import ABC, abstractmethod

from apps.users.domain.models import UserProfileEntity


class AbstractProfileRepository(ABC):
    @abstractmethod
    def get_by_user_id(self, user_id: int) -> UserProfileEntity | None: ...

    @abstractmethod
    def get_by_username(self, username: str) -> UserProfileEntity | None: ...

    @abstractmethod
    def update_profile(self, user_id: int, **fields) -> UserProfileEntity: ...
