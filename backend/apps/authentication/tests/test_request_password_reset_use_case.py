from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.application.use_cases.request_password_reset import (
    RequestPasswordResetUseCase,
)

from .fakes import InMemoryAuthRepository

USERNAME = "nika_gh"
EMAIL = "nika@example.com"
PASSWORD = "correct-horse-battery"


def _register(repo):
    return RegisterUserUseCase(repo).execute(USERNAME, EMAIL, PASSWORD)


def test_request_password_reset_for_a_known_email_returns_a_token():
    repo = InMemoryAuthRepository()
    _register(repo)

    result = RequestPasswordResetUseCase(repo).execute(EMAIL)

    assert result is not None
    assert result.email == EMAIL
    assert result.token
    assert repo.consume_password_reset_token(result.token) is not None


def test_request_password_reset_is_case_insensitive_on_email():
    repo = InMemoryAuthRepository()
    _register(repo)

    result = RequestPasswordResetUseCase(repo).execute(EMAIL.upper())

    assert result is not None


def test_request_password_reset_for_an_unknown_email_returns_none():
    repo = InMemoryAuthRepository()

    result = RequestPasswordResetUseCase(repo).execute("ghost@example.com")

    assert result is None


def test_request_password_reset_for_an_inactive_user_returns_none():
    repo = InMemoryAuthRepository()
    user = _register(repo)
    user.is_active = False

    result = RequestPasswordResetUseCase(repo).execute(EMAIL)

    assert result is None
