import pytest

from apps.users.application.use_cases.get_profile import (
    GetOwnProfileUseCase,
    GetPublicProfileUseCase,
    ListPublicProfilesByIdsUseCase,
)
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.domain.models import UserProfileEntity
from apps.users.tests.fakes import InMemoryProfileRepository


def _profile() -> UserProfileEntity:
    return UserProfileEntity(
        user_id=1,
        username="nika_gh",
        display_name="Nika Ghaderi",
        avatar_url="https://storage/avatars/nika.jpg",
        bio="Backend Developer",
        allow_group_invitations=True,
    )


def test_get_own_profile_returns_all_fields():
    profile = _profile()
    result = GetOwnProfileUseCase(InMemoryProfileRepository([profile])).execute(
        profile.user_id
    )

    assert result == profile


def test_get_public_profile_returns_profile_for_username():
    profile = _profile()
    result = GetPublicProfileUseCase(InMemoryProfileRepository([profile])).execute(
        profile.username
    )

    assert result == profile


def test_get_public_profile_raises_for_unknown_username():
    with pytest.raises(ProfileNotFoundError):
        GetPublicProfileUseCase(InMemoryProfileRepository()).execute("unknown")


def test_list_public_profiles_by_ids_returns_only_matching_profiles():
    profile = _profile()
    other = UserProfileEntity(
        user_id=2,
        username="samyar_l",
        display_name="Samyar Lajevardi",
        avatar_url="https://storage/avatars/samyar.jpg",
        bio="Product Owner",
        allow_group_invitations=True,
    )
    repo = InMemoryProfileRepository([profile, other])

    result = ListPublicProfilesByIdsUseCase(repo).execute([1, 2, 999])

    assert {p.user_id for p in result} == {1, 2}


def test_list_public_profiles_by_ids_deduplicates_input():
    profile = _profile()
    repo = InMemoryProfileRepository([profile])

    result = ListPublicProfilesByIdsUseCase(repo).execute([1, 1, 1])

    assert [p.user_id for p in result] == [1]


def test_list_public_profiles_by_ids_empty_input_returns_empty_list():
    result = ListPublicProfilesByIdsUseCase(InMemoryProfileRepository()).execute([])

    assert result == []
