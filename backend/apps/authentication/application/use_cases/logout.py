from __future__ import annotations

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import InvalidRefreshTokenError


class LogoutUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, refresh_token: str) -> None:
        try:
            token = RefreshToken(refresh_token)
        except TokenError as exc:
            raise InvalidRefreshTokenError("The refresh token is invalid.") from exc

        self._repository.blacklist_refresh_token(refresh_token, token["exp"])
