from __future__ import annotations

from django.contrib.auth.hashers import make_password

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.models import UserEntity


class RegisterUserUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, username: str, email: str, raw_password: str) -> UserEntity:
        user_entity = UserEntity(
            username=username,
            email=email,
            password_hash=make_password(raw_password),
        )
        return self._repository.save_user(user_entity)
