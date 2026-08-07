import pytest

from apps.users.application.use_cases.get_profile import (
    GetOwnProfileUseCase,
    GetPublicProfileUseCase,
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
