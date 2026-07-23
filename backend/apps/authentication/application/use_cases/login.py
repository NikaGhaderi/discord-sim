from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth.hashers import check_password

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import InvalidCredentialsError
from apps.authentication.domain.models import UserEntity


@dataclass(frozen=True)
class AuthenticatedUser:
    user: UserEntity


@dataclass(frozen=True)
class Requires2FA:
    email: str
    code: str
    temp_token: str


class LoginUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(
        self, username: str, raw_password: str
    ) -> AuthenticatedUser | Requires2FA:
        user = self._repository.get_by_username(username)
        if user is None or not check_password(raw_password, user.password_hash):
            raise InvalidCredentialsError("Invalid username or password.")

        if not user.is_active:
            raise InvalidCredentialsError("Invalid username or password.")

        if user.is_2fa_enabled:
            # get_by_username only ever returns persisted users, so id is set;
            # asserted (not re-raised as InvalidCredentialsError) so a broken
            # repository adapter surfaces as its own bug, not a bogus login failure.
            assert user.id is not None, "repository returned a user with no id"
            code, temp_token = self._repository.create_two_factor_challenge(user.id)
            # code/temp_token handed to the caller so the api layer can email/
            # return them; must never be logged or persisted in plaintext elsewhere.
            return Requires2FA(email=user.email, code=code, temp_token=temp_token)

        return AuthenticatedUser(user=user)
