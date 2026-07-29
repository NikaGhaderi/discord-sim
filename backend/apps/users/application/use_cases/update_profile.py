from apps.users.application.interfaces import AbstractProfileRepository
from apps.users.domain.models import UserProfileEntity


class UpdateProfileUseCase:
    editable_fields = {
        "display_name",
        "avatar_url",
        "bio",
        "allow_group_invitations",
    }

    def __init__(self, repository: AbstractProfileRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int, **fields) -> UserProfileEntity:
        supplied_fields = {
            field: value
            for field, value in fields.items()
            if field in self.editable_fields
        }
        return self._repository.update_profile(user_id, **supplied_fields)
