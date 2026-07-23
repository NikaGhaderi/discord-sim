from apps.authentication.application.use_cases.logout import LogoutUseCase

from .fakes import InMemoryAuthRepository


def test_logout_blacklists_the_refresh_token():
    repo = InMemoryAuthRepository()
    token = "some.refresh.token"

    assert repo.is_refresh_token_blacklisted(token) is False

    LogoutUseCase(repo).execute(token)

    assert repo.is_refresh_token_blacklisted(token) is True
