from __future__ import annotations

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import InvalidTwoFactorCodeError
from apps.authentication.domain.models import UserEntity


class VerifyTwoFactorUseCase:
    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int, code: str) -> UserEntity:
        user = self._repository.get_by_id(user_id)
        if user is None:
            raise InvalidTwoFactorCodeError("Invalid or expired 2FA code.")

        # Checked after the user lookup so a one-time code is never consumed
        # for an account that can't complete verification anyway.
        if not self._repository.verify_2fa_code(user_id, code):
            raise InvalidTwoFactorCodeError("Invalid or expired 2FA code.")
        return user
