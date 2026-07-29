from apps.users.application.use_cases.update_profile import UpdateProfileUseCase
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


def test_update_profile_only_overwrites_supplied_fields():
    original = _profile()

    updated = UpdateProfileUseCase(InMemoryProfileRepository([original])).execute(
        original.user_id,
        display_name="Nika",
        allow_group_invitations=False,
    )

    assert updated.display_name == "Nika"
    assert updated.allow_group_invitations is False
    assert updated.avatar_url == original.avatar_url
    assert updated.bio == original.bio


def test_update_profile_with_no_fields_keeps_profile_unchanged():
    original = _profile()

    updated = UpdateProfileUseCase(InMemoryProfileRepository([original])).execute(
        original.user_id
    )

    assert updated == original
