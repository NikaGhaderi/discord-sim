import pytest

from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.domain.exceptions import (
    DuplicateUserError,
    RegistrationValidationError,
)
from apps.authentication.domain.models import UserEntity

from .fakes import InMemoryAuthRepository


def test_register_hashes_the_password():
    repo = InMemoryAuthRepository()

    user = RegisterUserUseCase(repo).execute(
        "nika_gh", "nika@example.com", "S3curePassw0rd!"
    )

    assert isinstance(user, UserEntity)
    assert user.password_hash != "S3curePassw0rd!"
    assert user.password_hash.startswith("pbkdf2_sha256$")


def test_register_persists_and_assigns_an_id():
    repo = InMemoryAuthRepository()

    user = RegisterUserUseCase(repo).execute(
        "samyar", "samyar@example.com", "anotherPassw0rd!"
    )

    assert user.id is not None
    assert user.is_2fa_enabled is True
    stored = repo.get_by_username("samyar")
    assert stored is user
    assert stored.email == "samyar@example.com"


def test_register_lowercases_email():
    repo = InMemoryAuthRepository()

    user = RegisterUserUseCase(repo).execute(
        "parnia", "Parnia@Example.COM", "anotherPassw0rd!"
    )

    assert user.email == "parnia@example.com"


def test_register_rejects_invalid_email():
    repo = InMemoryAuthRepository()

    with pytest.raises(RegistrationValidationError):
        RegisterUserUseCase(repo).execute("fatemeh", "not-an-email", "anotherPassw0rd!")


def test_register_rejects_weak_password():
    repo = InMemoryAuthRepository()

    with pytest.raises(RegistrationValidationError):
        RegisterUserUseCase(repo).execute("fatemeh", "fatemeh@example.com", "123")


def test_register_rejects_duplicate_username():
    repo = InMemoryAuthRepository()
    RegisterUserUseCase(repo).execute("nika_gh", "nika@example.com", "S3curePassw0rd!")

    with pytest.raises(DuplicateUserError):
        RegisterUserUseCase(repo).execute(
            "nika_gh", "someone-else@example.com", "AnotherPassw0rd!"
        )


def test_register_rejects_duplicate_email():
    repo = InMemoryAuthRepository()
    RegisterUserUseCase(repo).execute("nika_gh", "nika@example.com", "S3curePassw0rd!")

    with pytest.raises(DuplicateUserError):
        RegisterUserUseCase(repo).execute(
            "someone_else", "nika@example.com", "AnotherPassw0rd!"
        )
