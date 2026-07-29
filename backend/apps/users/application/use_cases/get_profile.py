from apps.users.application.interfaces import AbstractProfileRepository
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.domain.models import UserProfileEntity


class GetOwnProfileUseCase:
    def __init__(self, repository: AbstractProfileRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int) -> UserProfileEntity:
        profile = self._repository.get_by_user_id(user_id)
        if profile is None:
            raise ProfileNotFoundError("Profile not found.")
        return profile


class GetPublicProfileUseCase:
    def __init__(self, repository: AbstractProfileRepository) -> None:
        self._repository = repository

    def execute(self, username: str) -> UserProfileEntity:
        profile = self._repository.get_by_username(username)
        if profile is None:
            raise ProfileNotFoundError("Profile not found.")
        return profile
