from __future__ import annotations

import secrets
from dataclasses import dataclass

from django.contrib.auth.hashers import check_password

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import InvalidCredentialsError
from apps.authentication.domain.models import UserEntity

_CODE_DIGITS = 6


@dataclass(frozen=True)
class AuthenticatedUser:
    user: UserEntity


@dataclass(frozen=True)
class Requires2FA:
    email: str
    code: str


class LoginUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(
        self, username: str, raw_password: str
    ) -> AuthenticatedUser | Requires2FA:
        user = self._repository.get_by_username(username)
        if user is None or not check_password(raw_password, user.password_hash):
            raise InvalidCredentialsError("Invalid username or password.")

        if user.is_2fa_enabled:
            code = f"{secrets.randbelow(10**_CODE_DIGITS):0{_CODE_DIGITS}d}"
            self._repository.store_2fa_code(user.id, code)
            # Handed to the caller so the api layer can email it out; must never
            # be serialized back to the client in an HTTP response.
            return Requires2FA(email=user.email, code=code)

        return AuthenticatedUser(user=user)
