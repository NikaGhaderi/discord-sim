from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.authentication.application.interfaces import AbstractAuthRepository
from apps.authentication.domain.exceptions import DuplicateUserError
from apps.authentication.domain.models import UserEntity
from apps.shared.infrastructure.auth_redis import RedisAuthStore


def _to_entity(django_user) -> UserEntity:
    return UserEntity(
        id=django_user.id,
        username=django_user.username,
        email=django_user.email,
        password_hash=django_user.password,
        is_2fa_enabled=django_user.is_2fa_enabled,
        allow_group_invitations=django_user.allow_group_invitations,
        is_active=django_user.is_active,
        created_at=django_user.date_joined,
    )


class DjangoAuthRepository(AbstractAuthRepository):
    """Django ORM + Redis adapter for AbstractAuthRepository.

    2FA challenge storage and refresh-token blacklisting are delegated to
    RedisAuthStore rather than reimplemented here -- it already has
    constant-time code comparison and hashed blacklist keys, with its own
    test coverage (apps/authentication/tests/test_auth_redis.py).
    """

    def __init__(self, auth_store: RedisAuthStore | None = None) -> None:
        self._auth_store = auth_store or RedisAuthStore()

    def get_by_username(self, username: str) -> UserEntity | None:
        django_user = get_user_model().objects.filter(username=username).first()
        return _to_entity(django_user) if django_user else None

    def get_by_id(self, user_id: int) -> UserEntity | None:
        django_user = get_user_model().objects.filter(id=user_id).first()
        return _to_entity(django_user) if django_user else None

    def get_by_email(self, email: str) -> UserEntity | None:
        django_user = get_user_model().objects.filter(email=email).first()
        return _to_entity(django_user) if django_user else None

    def save_user(self, user_entity: UserEntity) -> UserEntity:
        try:
            django_user = get_user_model().objects.create(
                username=user_entity.username,
                email=user_entity.email,
                password=user_entity.password_hash,
                is_2fa_enabled=user_entity.is_2fa_enabled,
                allow_group_invitations=user_entity.allow_group_invitations,
            )
        except IntegrityError as exc:
            raise DuplicateUserError(
                "This username or email is already in use."
            ) from exc
        return _to_entity(django_user)

    def create_two_factor_challenge(self, user_id: int) -> tuple[str, str]:
        return self._auth_store.create_two_factor_challenge(user_id)

    def consume_two_factor_challenge(self, temp_token: str, code: str) -> int | None:
        return self._auth_store.consume_two_factor_challenge(temp_token, code)

    def blacklist_refresh_token(self, token: str, expires_at: float) -> None:
        self._auth_store.blacklist_refresh_token(token, expires_at)

    def is_refresh_token_blacklisted(self, token: str) -> bool:
        return self._auth_store.is_refresh_token_blacklisted(token)

    def create_password_reset_token(self, user_id: int) -> str:
        return self._auth_store.create_password_reset_token(user_id)

    def consume_password_reset_token(self, token: str) -> int | None:
        return self._auth_store.consume_password_reset_token(token)

    def set_password(self, user_id: int, password_hash: str) -> None:
        get_user_model().objects.filter(id=user_id).update(password=password_hash)
