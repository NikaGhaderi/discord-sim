from apps.authentication.application.use_cases.register import RegisterUserUseCase
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
    stored = repo.get_by_username("samyar")
    assert stored is user
    assert stored.email == "samyar@example.com"
