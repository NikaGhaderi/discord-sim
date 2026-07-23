from __future__ import annotations

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import (
    DuplicateUserError,
    RegistrationValidationError,
)
from apps.authentication.domain.models import UserEntity


class RegisterUserUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, username: str, email: str, raw_password: str) -> UserEntity:
        email = email.strip().lower()
        try:
            validate_email(email)
        except DjangoValidationError:
            raise RegistrationValidationError("Enter a valid email address.")

        if self._repository.get_by_username(username) is not None:
            raise DuplicateUserError("This username is already in use.")
        if self._repository.get_by_email(email) is not None:
            raise DuplicateUserError("This email is already in use.")

        try:
            validate_password(raw_password)
        except DjangoValidationError as exc:
            raise RegistrationValidationError(" ".join(exc.messages))

        user_entity = UserEntity(
            username=username,
            email=email,
            password_hash=make_password(raw_password),
            is_2fa_enabled=True,
        )
        return self._repository.save_user(user_entity)
