from apps.private_spaces.application.interfaces import AbstractPrivateSpacesRepository
from apps.private_spaces.domain.exceptions import (
    DirectChatNotFoundError,
    SelfDirectChatError,
    UserNotFoundError,
)
from apps.private_spaces.domain.models import DirectChatEntity


class ListDirectChatsUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int) -> list[DirectChatEntity]:
        return self._repository.list_direct_chats_for_user(user_id)


class CreateOrGetDirectChatUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(
        self, user_id: int, target_user_id: int
    ) -> tuple[DirectChatEntity, bool]:
        if target_user_id == user_id:
            raise SelfDirectChatError("A direct chat requires two different users.")
        if not self._repository.user_exists(target_user_id):
            raise UserNotFoundError("Target user not found.")

        user1_id, user2_id = sorted((user_id, target_user_id))
        return self._repository.get_or_create_direct_chat(user1_id, user2_id)


class DeleteDirectChatUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, dm_id: int, requesting_user_id: int) -> None:
        chat = self._repository.get_direct_chat_for_participant(
            dm_id, requesting_user_id
        )
        if chat is None:
            raise DirectChatNotFoundError("Direct chat not found.")
        self._repository.delete_direct_chat(dm_id)
