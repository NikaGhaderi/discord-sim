from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.application.use_cases import (
    DuplicateUserError,
    InvalidCredentialsError,
    LoginUseCase,
    LogoutUseCase,
    RegisterUserUseCase,
    UseCaseError,
    VerifyTwoFactorUseCase,
)


class UseCaseAPIView(APIView):
    @staticmethod
    def error_response(exc):
        if isinstance(exc, InvalidCredentialsError):
            status_code = 401
        elif isinstance(exc, DuplicateUserError):
            status_code = 409
        else:
            status_code = 400
        return Response({"errors": exc.errors}, status=status_code)


class RegisterView(UseCaseAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = RegisterUserUseCase().execute(request.data)
        except UseCaseError as exc:
            return self.error_response(exc)
        return Response(result, status=201)


class LoginView(UseCaseAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = LoginUseCase().execute(request.data)
        except UseCaseError as exc:
            return self.error_response(exc)

        if result.requires_2fa:
            code = result.code
            # TODO: Replace this stub with send_2fa_email_task via Celery.
            print(f"DEBUG: 2FA Code is {code}")
            return Response(
                {"status": "2FA_REQUIRED", "temp_token": result.temp_token},
                status=200,
            )
        return Response(result.tokens, status=200)


class VerifyTwoFactorView(UseCaseAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = VerifyTwoFactorUseCase().execute(request.data)
        except UseCaseError as exc:
            return self.error_response(exc)
        return Response(result, status=200)


class LogoutView(UseCaseAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            result = LogoutUseCase().execute(request.data)
        except UseCaseError as exc:
            return self.error_response(exc)
        return Response(result, status=200)
