from apps.users.application.interfaces import AbstractProfileRepository
from apps.users.domain.models import UserProfileEntity


class UploadAvatarUseCase:
    def __init__(self, repository: AbstractProfileRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int, uploaded_file) -> UserProfileEntity:
        return self._repository.update_avatar(user_id, uploaded_file)
