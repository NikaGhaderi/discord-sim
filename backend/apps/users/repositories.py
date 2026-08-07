from apps.users.application.interfaces import AbstractProfileRepository
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.domain.models import UserProfileEntity
from apps.users.models import Profile


def _to_entity(profile: Profile) -> UserProfileEntity:
    return UserProfileEntity(
        user_id=profile.user_id,
        username=profile.user.username,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
        bio=profile.bio,
        allow_group_invitations=profile.allow_group_invitations,
    )


class DjangoProfileRepository(AbstractProfileRepository):
    def get_by_user_id(self, user_id: int) -> UserProfileEntity | None:
        profile = Profile.objects.select_related("user").filter(user_id=user_id).first()
        return _to_entity(profile) if profile else None

    def get_by_username(self, username: str) -> UserProfileEntity | None:
        profile = (
            Profile.objects.select_related("user")
            .filter(user__username=username)
            .first()
        )
        return _to_entity(profile) if profile else None

    def update_profile(self, user_id: int, **fields) -> UserProfileEntity:
        try:
            profile = Profile.objects.select_related("user").get(user_id=user_id)
        except Profile.DoesNotExist as exc:
            raise ProfileNotFoundError("Profile not found.") from exc

        for field, value in fields.items():
            setattr(profile, field, value)

        if fields:
            profile.save(update_fields=list(fields))
        return _to_entity(profile)
