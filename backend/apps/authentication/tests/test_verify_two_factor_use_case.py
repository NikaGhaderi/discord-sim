import pytest

from apps.authentication.application.use_cases.login import LoginUseCase, Requires2FA
from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.application.use_cases.verify_two_factor import (
    VerifyTwoFactorUseCase,
)
from apps.authentication.domain.exceptions import InvalidTwoFactorCodeError

from .fakes import InMemoryAuthRepository

USERNAME = "nika_gh"
EMAIL = "nika@example.com"
PASSWORD = "correct-horse-battery"


def _login_and_request_2fa(repo) -> Requires2FA:
    user = RegisterUserUseCase(repo).execute(USERNAME, EMAIL, PASSWORD)
    user.is_2fa_enabled = True
    result = LoginUseCase(repo).execute(USERNAME, PASSWORD)
    assert isinstance(result, Requires2FA)
    return user, result


def test_verify_with_correct_code_returns_the_user():
    repo = InMemoryAuthRepository()
    user, requires_2fa = _login_and_request_2fa(repo)

    verified = VerifyTwoFactorUseCase(repo).execute(user.id, requires_2fa.code)

    assert verified.id == user.id
    assert verified.username == USERNAME


def test_verify_with_wrong_code_raises():
    repo = InMemoryAuthRepository()
    user, _requires_2fa = _login_and_request_2fa(repo)

    with pytest.raises(InvalidTwoFactorCodeError):
        VerifyTwoFactorUseCase(repo).execute(user.id, "000000")


def test_code_can_only_be_used_once():
    repo = InMemoryAuthRepository()
    user, requires_2fa = _login_and_request_2fa(repo)

    VerifyTwoFactorUseCase(repo).execute(user.id, requires_2fa.code)

    with pytest.raises(InvalidTwoFactorCodeError):
        VerifyTwoFactorUseCase(repo).execute(user.id, requires_2fa.code)
