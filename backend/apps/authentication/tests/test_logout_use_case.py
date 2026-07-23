from types import SimpleNamespace

import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.application.use_cases.logout import LogoutUseCase
from apps.authentication.domain.exceptions import InvalidRefreshTokenError

from .fakes import InMemoryAuthRepository


def test_logout_blacklists_a_valid_refresh_token():
    repo = InMemoryAuthRepository()
    token = str(RefreshToken.for_user(SimpleNamespace(pk=1, id=1)))

    assert repo.is_refresh_token_blacklisted(token) is False

    LogoutUseCase(repo).execute(token, requesting_user_id=1)

    assert repo.is_refresh_token_blacklisted(token) is True


def test_logout_with_garbage_token_raises():
    repo = InMemoryAuthRepository()

    with pytest.raises(InvalidRefreshTokenError):
        LogoutUseCase(repo).execute("not-a-real-token", requesting_user_id=1)


def test_logout_with_token_belonging_to_a_different_user_raises():
    repo = InMemoryAuthRepository()
    token = str(RefreshToken.for_user(SimpleNamespace(pk=1, id=1)))

    with pytest.raises(InvalidRefreshTokenError):
        LogoutUseCase(repo).execute(token, requesting_user_id=999)
