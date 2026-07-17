from __future__ import annotations

from apps.authentication.application.interfaces import AbstractAuthRepository


class LogoutUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, refresh_token: str) -> None:
        self._repository.blacklist_refresh_token(refresh_token)
