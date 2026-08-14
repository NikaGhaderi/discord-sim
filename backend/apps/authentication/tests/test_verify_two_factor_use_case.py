import pytest

from apps.authentication.application.use_cases.login import Requires2FA
from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.application.use_cases.verify_two_factor import (
    VerifyTwoFactorUseCase,
)
from apps.authentication.domain.exceptions import InvalidTwoFactorCodeError
from apps.authentication.domain.models import UserEntity

from .fakes import InMemoryAuthRepository

USERNAME = "nika_gh"
EMAIL = "nika@example.com"
PASSWORD = "correct-horse-battery"


def _login_and_request_2fa(repo) -> tuple[UserEntity, Requires2FA]:
    # production branch only: LoginUseCase itself never takes the 2FA path
    # here (see login.py), but VerifyTwoFactorUseCase is unchanged and still
    # real/correct code -- exercise it directly against the repository
    # instead of relying on LoginUseCase to produce the challenge.
    user = RegisterUserUseCase(repo).execute(USERNAME, EMAIL, PASSWORD)
    user.is_2fa_enabled = True
    code, temp_token = repo.create_two_factor_challenge(user.id)
    return user, Requires2FA(email=user.email, code=code, temp_token=temp_token)


def test_verify_with_correct_code_returns_the_user():
    repo = InMemoryAuthRepository()
    user, requires_2fa = _login_and_request_2fa(repo)

    verified = VerifyTwoFactorUseCase(repo).execute(
        requires_2fa.temp_token, requires_2fa.code
    )

    assert verified.id == user.id
    assert verified.username == USERNAME


def test_verify_with_wrong_code_raises():
    repo = InMemoryAuthRepository()
    _user, requires_2fa = _login_and_request_2fa(repo)

    with pytest.raises(InvalidTwoFactorCodeError):
        VerifyTwoFactorUseCase(repo).execute(requires_2fa.temp_token, "000000")


def test_verify_with_unknown_temp_token_raises():
    repo = InMemoryAuthRepository()

    with pytest.raises(InvalidTwoFactorCodeError):
        VerifyTwoFactorUseCase(repo).execute("no-such-token", "123456")


def test_code_can_only_be_used_once():
    repo = InMemoryAuthRepository()
    _user, requires_2fa = _login_and_request_2fa(repo)

    VerifyTwoFactorUseCase(repo).execute(requires_2fa.temp_token, requires_2fa.code)

    with pytest.raises(InvalidTwoFactorCodeError):
        VerifyTwoFactorUseCase(repo).execute(requires_2fa.temp_token, requires_2fa.code)


def test_verify_fails_if_user_became_inactive_after_login():
    repo = InMemoryAuthRepository()
    user, requires_2fa = _login_and_request_2fa(repo)
    user.is_active = False

    with pytest.raises(InvalidTwoFactorCodeError):
        VerifyTwoFactorUseCase(repo).execute(requires_2fa.temp_token, requires_2fa.code)
