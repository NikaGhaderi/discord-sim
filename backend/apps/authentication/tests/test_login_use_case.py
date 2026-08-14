import pytest

from apps.authentication.application.use_cases.login import (
    AuthenticatedUser,
    LoginUseCase,
)
from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.domain.exceptions import InvalidCredentialsError

from .fakes import InMemoryAuthRepository

USERNAME = "nika_gh"
EMAIL = "nika@example.com"
PASSWORD = "correct-horse-battery"


def _register(repo, *, is_2fa_enabled=False):
    user = RegisterUserUseCase(repo).execute(USERNAME, EMAIL, PASSWORD)
    user.is_2fa_enabled = is_2fa_enabled
    return user


def test_login_with_correct_credentials_and_no_2fa_returns_authenticated_user():
    repo = InMemoryAuthRepository()
    _register(repo, is_2fa_enabled=False)

    result = LoginUseCase(repo).execute(USERNAME, PASSWORD)

    assert isinstance(result, AuthenticatedUser)
    assert result.user.username == USERNAME


def test_login_with_2fa_enabled_still_returns_authenticated_user_on_this_branch():
    # production branch only: 2FA is force-disabled at login regardless of
    # is_2fa_enabled, since this deployment has no working outbound email
    # to actually deliver a code. See login.py for why -- do not merge this
    # test change back to develop/main, which keep the real Requires2FA path.
    repo = InMemoryAuthRepository()
    _register(repo, is_2fa_enabled=True)

    result = LoginUseCase(repo).execute(USERNAME, PASSWORD)

    assert isinstance(result, AuthenticatedUser)
    assert result.user.username == USERNAME


def test_login_with_email_instead_of_username_succeeds():
    repo = InMemoryAuthRepository()
    _register(repo, is_2fa_enabled=False)

    result = LoginUseCase(repo).execute(EMAIL, PASSWORD)

    assert isinstance(result, AuthenticatedUser)
    assert result.user.username == USERNAME


def test_login_with_wrong_password_raises_invalid_credentials():
    repo = InMemoryAuthRepository()
    _register(repo)

    with pytest.raises(InvalidCredentialsError):
        LoginUseCase(repo).execute(USERNAME, "wrong-password")


def test_login_with_unknown_username_raises_invalid_credentials():
    repo = InMemoryAuthRepository()

    with pytest.raises(InvalidCredentialsError):
        LoginUseCase(repo).execute("ghost", "whatever")


def test_login_with_inactive_user_raises_invalid_credentials():
    repo = InMemoryAuthRepository()
    user = _register(repo, is_2fa_enabled=False)
    user.is_active = False

    with pytest.raises(InvalidCredentialsError):
        LoginUseCase(repo).execute(USERNAME, PASSWORD)
