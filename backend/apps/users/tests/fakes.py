from dataclasses import replace

from apps.users.application.interfaces import AbstractProfileRepository
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.domain.models import UserProfileEntity


class InMemoryProfileRepository(AbstractProfileRepository):
    def __init__(self, profiles: list[UserProfileEntity] | None = None) -> None:
        profiles = profiles or []
        self._profiles_by_user_id = {profile.user_id: profile for profile in profiles}
        self._profiles_by_username = {profile.username: profile for profile in profiles}

    def get_by_user_id(self, user_id: int) -> UserProfileEntity | None:
        return self._profiles_by_user_id.get(user_id)

    def get_by_username(self, username: str) -> UserProfileEntity | None:
        return self._profiles_by_username.get(username)

    def list_by_user_ids(self, user_ids: list[int]) -> list[UserProfileEntity]:
        return [
            self._profiles_by_user_id[uid]
            for uid in user_ids
            if uid in self._profiles_by_user_id
        ]

    def update_profile(self, user_id: int, **fields) -> UserProfileEntity:
        profile = self.get_by_user_id(user_id)
        if profile is None:
            raise ProfileNotFoundError("Profile not found.")

        updated_profile = replace(profile, **fields)
        self._profiles_by_user_id[user_id] = updated_profile
        self._profiles_by_username[updated_profile.username] = updated_profile
        return updated_profile

    def update_avatar(self, user_id: int, uploaded_file) -> UserProfileEntity:
        return self.update_profile(user_id, avatar_url=f"/media/avatars/{uploaded_file.name}")
