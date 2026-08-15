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


class ListPublicProfilesByIdsUseCase:
    """Bulk-resolves user ids to public profiles.

    Not part of the Phase 1 doc's §8-1 contract -- the doc only specifies a
    by-username lookup. Added because private_spaces (DMs, group
    invitations, group membership) only ever carries raw user ids, and
    there was otherwise no way to show a username for them. Deliberately
    silent about ids that don't resolve (deleted/bad id) rather than
    raising -- callers treat a missing id as "unresolvable" and fall back
    to displaying the id, they don't need to distinguish that from a 404.
    """

    def __init__(self, repository: AbstractProfileRepository) -> None:
        self._repository = repository

    def execute(self, user_ids: list[int]) -> list[UserProfileEntity]:
        unique_ids = list(dict.fromkeys(user_ids))
        return self._repository.list_by_user_ids(unique_ids)
