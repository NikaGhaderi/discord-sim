from __future__ import annotations

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import InvalidTwoFactorCodeError
from apps.authentication.domain.models import UserEntity


class VerifyTwoFactorUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, temp_token: str, code: str) -> UserEntity:
        user_id = self._repository.consume_two_factor_challenge(temp_token, code)
        if user_id is None:
            raise InvalidTwoFactorCodeError("Invalid or expired 2FA code.")

        user = self._repository.get_by_id(user_id)
        if user is None:
            raise InvalidTwoFactorCodeError("Invalid or expired 2FA code.")
        return user
