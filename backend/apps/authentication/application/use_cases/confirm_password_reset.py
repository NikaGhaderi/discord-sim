from __future__ import annotations

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import (
    InvalidPasswordResetTokenError,
    PasswordResetValidationError,
)


class ConfirmPasswordResetUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, token: str, new_password: str) -> None:
        user_id = self._repository.consume_password_reset_token(token)
        if user_id is None:
            raise InvalidPasswordResetTokenError(
                "This password reset link is invalid or has expired."
            )

        user = self._repository.get_by_id(user_id)
        if user is None or not user.is_active:
            raise InvalidPasswordResetTokenError(
                "This password reset link is invalid or has expired."
            )

        try:
            validate_password(new_password)
        except DjangoValidationError as exc:
            raise PasswordResetValidationError(" ".join(exc.messages)) from exc

        self._repository.set_password(user_id, make_password(new_password))
