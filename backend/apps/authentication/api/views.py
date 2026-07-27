from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.application.use_cases.login import (
    AuthenticatedUser,
    LoginUseCase,
    Requires2FA,
)
from apps.authentication.application.use_cases.logout import LogoutUseCase
from apps.authentication.application.use_cases.register import RegisterUserUseCase
from apps.authentication.application.use_cases.verify_two_factor import (
    VerifyTwoFactorUseCase,
)
from apps.authentication.domain.exceptions import (
    DuplicateUserError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidTwoFactorCodeError,
    RegistrationValidationError,
)
from apps.authentication.repositories import DjangoAuthRepository
from core.tasks.email import send_email_task


def _issue_jwt_pair(user_id: int) -> dict:
    django_user = get_user_model().objects.get(pk=user_id)
    refresh = RefreshToken.for_user(django_user)
    return {"access_token": str(refresh.access_token), "refresh_token": str(refresh)}


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            user = RegisterUserUseCase(DjangoAuthRepository()).execute(
                username=request.data.get("username", ""),
                email=request.data.get("email", ""),
                raw_password=request.data.get("password", ""),
            )
        except DuplicateUserError as exc:
            return Response({"detail": str(exc)}, status=409)
        except RegistrationValidationError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(
            {
                "user_id": user.id,
                "username": user.username,
                **_issue_jwt_pair(user.id),
            },
            status=201,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = LoginUseCase(DjangoAuthRepository()).execute(
                username=request.data.get("username", ""),
                raw_password=request.data.get("password", ""),
            )
        except InvalidCredentialsError:
            return Response(
                {"detail": "Unable to log in with the provided credentials."},
                status=401,
            )

        if isinstance(result, Requires2FA):
            send_email_task.delay(
                result.email,
                "Your Discord-Sim verification code",
                f"Your two-factor authentication code is {result.code}. "
                "It will expire shortly.",
            )
            return Response(
                {"status": "2FA_REQUIRED", "temp_token": result.temp_token},
                status=200,
            )

        assert isinstance(result, AuthenticatedUser)
        return Response(_issue_jwt_pair(result.user.id), status=200)


class VerifyTwoFactorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            user = VerifyTwoFactorUseCase(DjangoAuthRepository()).execute(
                temp_token=request.data.get("temp_token", ""),
                code=request.data.get("code", ""),
            )
        except InvalidTwoFactorCodeError:
            return Response(
                {"detail": "The 2FA code is invalid or expired."}, status=400
            )

        return Response(_issue_jwt_pair(user.id), status=200)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            LogoutUseCase(DjangoAuthRepository()).execute(
                request.data.get("refresh_token", ""), request.user.id
            )
        except InvalidRefreshTokenError:
            return Response({"detail": "The refresh token is invalid."}, status=400)

        return Response({"message": "Successfully logged out."}, status=200)


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token", "")
        repository = DjangoAuthRepository()

        if repository.is_refresh_token_blacklisted(refresh_token):
            return Response(
                {"detail": "This refresh token has been revoked."}, status=401
            )

        try:
            token = RefreshToken(refresh_token)
        except TokenError:
            return Response({"detail": "The refresh token is invalid."}, status=401)

        return Response({"access_token": str(token.access_token)}, status=200)
