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
        # The login field accepts either a username or an email address (the
        # frontend's field is labeled "Email" but the value is sent as
        # `username` regardless) -- try an exact username match first, then
        # fall back to treating it as an email.
        user = self._repository.get_by_username(
            username
        ) or self._repository.get_by_email(username)
        if user is None or not check_password(raw_password, user.password_hash):
            raise InvalidCredentialsError("Invalid username or password.")

        if not user.is_active:
            raise InvalidCredentialsError("Invalid username or password.")

        # production branch only: 2FA is disabled here regardless of
        # user.is_2fa_enabled -- this deployment has no working outbound
        # email (no domain to verify with a provider), so a 2FA code would
        # never actually reach anyone and login would be permanently
        # blocked. develop/main keep the real check; do not merge this
        # change back there.
        return AuthenticatedUser(user=user)
