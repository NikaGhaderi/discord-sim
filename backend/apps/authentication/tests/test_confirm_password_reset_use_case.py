import pytest
from django.contrib.auth.hashers import check_password

from apps.authentication.application.use_cases.confirm_password_reset import (
    ConfirmPasswordResetUseCase,
)
from apps.authentication.application.use_cases.login import LoginUseCase
from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.domain.exceptions import (
    InvalidPasswordResetTokenError,
    PasswordResetValidationError,
)

from .fakes import InMemoryAuthRepository

USERNAME = "nika_gh"
EMAIL = "nika@example.com"
OLD_PASSWORD = "correct-horse-battery"
NEW_PASSWORD = "Tr0ub4dor-2026"


def _register(repo):
    return RegisterUserUseCase(repo).execute(USERNAME, EMAIL, OLD_PASSWORD)


def test_confirm_password_reset_with_a_valid_token_changes_the_password():
    repo = InMemoryAuthRepository()
    user = _register(repo)
    token = repo.create_password_reset_token(user.id)

    ConfirmPasswordResetUseCase(repo).execute(token, NEW_PASSWORD)

    stored = repo.get_by_id(user.id)
    assert check_password(NEW_PASSWORD, stored.password_hash)
    assert not check_password(OLD_PASSWORD, stored.password_hash)


def test_confirm_password_reset_lets_the_user_log_in_with_the_new_password():
    repo = InMemoryAuthRepository()
    user = _register(repo)
    token = repo.create_password_reset_token(user.id)

    ConfirmPasswordResetUseCase(repo).execute(token, NEW_PASSWORD)

    # Old password no longer works, new one does -- a real end-to-end check,
    # not just inspecting the stored hash.
    from apps.authentication.domain.exceptions import InvalidCredentialsError

    with pytest.raises(InvalidCredentialsError):
        LoginUseCase(repo).execute(USERNAME, OLD_PASSWORD)

    result = LoginUseCase(repo).execute(USERNAME, NEW_PASSWORD)
    assert result is not None


def test_confirm_password_reset_token_is_single_use():
    repo = InMemoryAuthRepository()
    user = _register(repo)
    token = repo.create_password_reset_token(user.id)

    ConfirmPasswordResetUseCase(repo).execute(token, NEW_PASSWORD)

    with pytest.raises(InvalidPasswordResetTokenError):
        ConfirmPasswordResetUseCase(repo).execute(token, "SomeOtherPassw0rd!")


def test_confirm_password_reset_with_an_unknown_token_raises():
    repo = InMemoryAuthRepository()

    with pytest.raises(InvalidPasswordResetTokenError):
        ConfirmPasswordResetUseCase(repo).execute("never-issued", NEW_PASSWORD)


def test_confirm_password_reset_for_an_inactive_user_raises():
    repo = InMemoryAuthRepository()
    user = _register(repo)
    user.is_active = False
    token = repo.create_password_reset_token(user.id)

    with pytest.raises(InvalidPasswordResetTokenError):
        ConfirmPasswordResetUseCase(repo).execute(token, NEW_PASSWORD)


def test_confirm_password_reset_rejects_a_weak_new_password():
    repo = InMemoryAuthRepository()
    user = _register(repo)
    token = repo.create_password_reset_token(user.id)

    with pytest.raises(PasswordResetValidationError):
        ConfirmPasswordResetUseCase(repo).execute(token, "password123")
