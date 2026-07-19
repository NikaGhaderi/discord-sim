from dataclasses import dataclass

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import IntegrityError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.shared.infrastructure.auth_redis import RedisAuthStore


class UseCaseError(Exception):
    def __init__(self, errors):
        super().__init__(str(errors))
        self.errors = errors


class InvalidCredentialsError(UseCaseError):
    pass


class DuplicateUserError(UseCaseError):
    pass


@dataclass(frozen=True)
class LoginResult:
    requires_2fa: bool
    code: str | None = None
    temp_token: str | None = None
    tokens: dict | None = None


def _tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
    }


def _require_text(payload, field):
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip():
        raise UseCaseError({field: ["This field is required."]})
    return value.strip()


class RegisterUserUseCase:
    def execute(self, payload):
        username = _require_text(payload, "username")
        email = _require_text(payload, "email").lower()
        password = _require_text(payload, "password")

        try:
            validate_email(email)
        except DjangoValidationError:
            raise UseCaseError({"email": ["Enter a valid email address."]})

        user_model = get_user_model()
        if user_model.objects.filter(username=username).exists():
            raise DuplicateUserError({"username": ["This username is already in use."]})
        if user_model.objects.filter(email=email).exists():
            raise DuplicateUserError({"email": ["This email is already in use."]})

        candidate = user_model(username=username, email=email)
        try:
            validate_password(password, candidate)
        except DjangoValidationError as exc:
            raise UseCaseError({"password": list(exc.messages)})

        try:
            user = user_model.objects.create_user(
                username=username,
                email=email,
                password=password,
            )
        except IntegrityError:
            raise DuplicateUserError(
                {"user": ["The username or email is already in use."]}
            )
        return {
            "user_id": user.pk,
            "username": user.username,
            **_tokens_for_user(user),
        }


class LoginUseCase:
    def __init__(self, auth_store=None):
        self.auth_store = auth_store or RedisAuthStore()

    def execute(self, payload):
        username = _require_text(payload, "username")
        password = _require_text(payload, "password")
        user = authenticate(username=username, password=password)
        if user is None:
            raise InvalidCredentialsError(
                {"detail": ["Unable to log in with the provided credentials."]}
            )

        code, temp_token = self.auth_store.create_two_factor_challenge(user.pk)
        return LoginResult(
            requires_2fa=True,
            code=code,
            temp_token=temp_token,
        )


class VerifyTwoFactorUseCase:
    def __init__(self, auth_store=None):
        self.auth_store = auth_store or RedisAuthStore()

    def execute(self, payload):
        temp_token = _require_text(payload, "temp_token")
        code = _require_text(payload, "code")
        user_id = self.auth_store.consume_two_factor_challenge(temp_token, code)
        if user_id is None:
            raise UseCaseError({"code": ["The 2FA code is invalid or expired."]})

        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=user_id, is_active=True)
        except user_model.DoesNotExist:
            raise InvalidCredentialsError({"detail": ["The user is not available."]})
        return _tokens_for_user(user)


class LogoutUseCase:
    def __init__(self, auth_store=None):
        self.auth_store = auth_store or RedisAuthStore()

    def execute(self, payload):
        refresh_token = _require_text(payload, "refresh_token")
        try:
            token = RefreshToken(refresh_token)
        except TokenError:
            raise UseCaseError({"refresh_token": ["The refresh token is invalid."]})

        self.auth_store.blacklist_refresh_token(refresh_token, token["exp"])
        return {"message": "Successfully logged out."}
