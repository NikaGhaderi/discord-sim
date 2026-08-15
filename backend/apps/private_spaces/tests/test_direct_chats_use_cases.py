import pytest

from apps.private_spaces.application.use_cases.direct_chats import (
    CreateOrGetDirectChatUseCase,
    DeleteDirectChatUseCase,
    ListDirectChatsUseCase,
)
from apps.private_spaces.domain.exceptions import (
    DirectChatNotFoundError,
    SelfDirectChatError,
    UserNotFoundError,
)
from apps.private_spaces.tests.fakes import InMemoryPrivateSpacesRepository


class TestCreateOrGetDirectChatUseCase:
    def test_creates_a_new_chat_with_canonical_user_ordering(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_user(5)
        repo.seed_user(2)

        chat, created = CreateOrGetDirectChatUseCase(repo).execute(
            user_id=5, target_user_id=2
        )

        assert created is True
        assert chat.user1_id == 2
        assert chat.user2_id == 5

    def test_returns_the_existing_chat_instead_of_a_duplicate(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_user(1)
        repo.seed_user(2)
        first, _ = CreateOrGetDirectChatUseCase(repo).execute(1, 2)

        second, created = CreateOrGetDirectChatUseCase(repo).execute(2, 1)

        assert created is False
        assert second.id == first.id

    def test_rejects_a_self_chat(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_user(1)

        with pytest.raises(SelfDirectChatError):
            CreateOrGetDirectChatUseCase(repo).execute(user_id=1, target_user_id=1)

    def test_rejects_a_nonexistent_target_user(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_user(1)

        with pytest.raises(UserNotFoundError):
            CreateOrGetDirectChatUseCase(repo).execute(user_id=1, target_user_id=999)


class TestDeleteDirectChatUseCase:
    def test_participant_can_delete(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_user(1)
        repo.seed_user(2)
        chat, _ = CreateOrGetDirectChatUseCase(repo).execute(1, 2)

        DeleteDirectChatUseCase(repo).execute(dm_id=chat.id, requesting_user_id=1)

        assert repo.list_direct_chats_for_user(1) == []

    def test_non_participant_cannot_delete(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_user(1)
        repo.seed_user(2)
        chat, _ = CreateOrGetDirectChatUseCase(repo).execute(1, 2)

        with pytest.raises(DirectChatNotFoundError):
            DeleteDirectChatUseCase(repo).execute(dm_id=chat.id, requesting_user_id=999)


class TestListDirectChatsUseCase:
    def test_lists_only_the_users_chats(self):
        repo = InMemoryPrivateSpacesRepository()
        for uid in (1, 2, 3):
            repo.seed_user(uid)
        CreateOrGetDirectChatUseCase(repo).execute(1, 2)
        CreateOrGetDirectChatUseCase(repo).execute(2, 3)

        result = ListDirectChatsUseCase(repo).execute(user_id=1)

        assert len(result) == 1
