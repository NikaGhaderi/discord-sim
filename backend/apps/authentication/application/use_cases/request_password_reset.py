from __future__ import annotations

from dataclasses import dataclass

from apps.authentication.application.interfaces import AbstractAuthRepository


@dataclass(frozen=True)
class PasswordResetRequested:
    email: str
    token: str


class RequestPasswordResetUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, email: str) -> PasswordResetRequested | None:
        """Returns None when there's nothing to email (unknown/inactive
        user). Callers MUST NOT let that difference leak into the HTTP
        response -- the whole point of the anti-enumeration business rule is
        that the caller always responds the same way either way."""
        email = email.strip().lower()
        user = self._repository.get_by_email(email)
        if user is None or not user.is_active:
            return None

        assert user.id is not None, "repository returned a user with no id"
        token = self._repository.create_password_reset_token(user.id)
        return PasswordResetRequested(email=user.email, token=token)
