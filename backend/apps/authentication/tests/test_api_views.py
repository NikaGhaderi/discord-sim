from types import SimpleNamespace
from unittest.mock import patch

from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.api.views import LogoutView
from apps.authentication.application.use_cases.login import (
    AuthenticatedUser,
    Requires2FA,
)
from apps.authentication.application.use_cases.request_password_reset import (
    PasswordResetRequested,
)
from apps.authentication.domain.exceptions import (
    InvalidPasswordResetTokenError,
    PasswordResetValidationError,
)
from apps.authentication.domain.models import UserEntity


class TestAuthenticationApiViews:
    @patch("apps.authentication.api.views._issue_jwt_pair")
    @patch("apps.authentication.api.views.RegisterUserUseCase")
    def test_register_matches_phase_one_contract(self, use_case_class, issue_tokens):
        use_case_class.return_value.execute.return_value = UserEntity(
            id=1, username="nika_gh", email="nika@example.com", password_hash="x"
        )
        issue_tokens.return_value = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

        response = APIClient().post(
            "/api/auth/register/",
            {
                "username": "nika_gh",
                "email": "nika@example.com",
                "password": "securepassword123",
            },
            format="json",
        )

        assert response.status_code == 201
        assert response.json() == {
            "user_id": 1,
            "username": "nika_gh",
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

    @patch("apps.authentication.api.views.send_email_task")
    @patch("apps.authentication.api.views.LoginUseCase")
    def test_login_emails_the_two_factor_code_and_returns_temp_token(
        self, use_case_class, send_email_task
    ):
        use_case_class.return_value.execute.return_value = Requires2FA(
            email="nika@example.com", code="123456", temp_token="temporary-token"
        )

        response = APIClient().post(
            "/api/auth/login/",
            {"username": "nika_gh", "password": "securepassword123"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "status": "2FA_REQUIRED",
            "temp_token": "temporary-token",
        }
        send_email_task.delay.assert_called_once_with(
            "nika@example.com",
            "Your Discord-Sim verification code",
            "Your two-factor authentication code is 123456. It will expire shortly.",
        )

    @patch("apps.authentication.api.views._issue_jwt_pair")
    @patch("apps.authentication.api.views.LoginUseCase")
    def test_login_without_2fa_returns_tokens_directly(
        self, use_case_class, issue_tokens
    ):
        use_case_class.return_value.execute.return_value = AuthenticatedUser(
            user=UserEntity(
                id=1, username="nika_gh", email="nika@example.com", password_hash="x"
            )
        )
        issue_tokens.return_value = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

        response = APIClient().post(
            "/api/auth/login/",
            {"username": "nika_gh", "password": "securepassword123"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

    @patch("apps.authentication.api.views._issue_jwt_pair")
    @patch("apps.authentication.api.views.VerifyTwoFactorUseCase")
    def test_verify_two_factor_returns_final_tokens(self, use_case_class, issue_tokens):
        use_case_class.return_value.execute.return_value = UserEntity(
            id=1, username="nika_gh", email="nika@example.com", password_hash="x"
        )
        issue_tokens.return_value = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

        response = APIClient().post(
            "/api/auth/verify-2fa/",
            {"temp_token": "temporary-token", "code": "123456"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

    @patch("apps.authentication.api.views.LogoutUseCase")
    def test_logout_returns_documented_success_response(self, use_case_class):
        use_case_class.return_value.execute.return_value = None
        request = APIRequestFactory().post(
            "/api/auth/logout/",
            {"refresh_token": "refresh-token"},
            format="json",
        )
        force_authenticate(request, user=SimpleNamespace(is_authenticated=True, id=1))

        response = LogoutView.as_view()(request)

        assert response.status_code == 200
        assert response.data == {"message": "Successfully logged out."}

    @patch("apps.authentication.api.views.DjangoAuthRepository")
    def test_refresh_returns_new_access_token_when_not_blacklisted(self, repo_class):
        repo_class.return_value.is_refresh_token_blacklisted.return_value = False
        token = str(RefreshToken.for_user(SimpleNamespace(pk=1, id=1)))

        response = APIClient().post(
            "/api/auth/refresh/", {"refresh_token": token}, format="json"
        )

        assert response.status_code == 200
        assert "access_token" in response.json()

    @patch("apps.authentication.api.views.DjangoAuthRepository")
    def test_refresh_rejects_blacklisted_token(self, repo_class):
        repo_class.return_value.is_refresh_token_blacklisted.return_value = True

        response = APIClient().post(
            "/api/auth/refresh/", {"refresh_token": "whatever"}, format="json"
        )

        assert response.status_code == 401

    @patch("apps.authentication.api.views.DjangoAuthRepository")
    def test_refresh_rejects_invalid_token(self, repo_class):
        repo_class.return_value.is_refresh_token_blacklisted.return_value = False

        response = APIClient().post(
            "/api/auth/refresh/", {"refresh_token": "not-a-real-token"}, format="json"
        )

        assert response.status_code == 401

    @patch("apps.authentication.api.views.send_email_task")
    @patch("apps.authentication.api.views.RequestPasswordResetUseCase")
    def test_password_reset_request_emails_a_link_when_the_account_exists(
        self, use_case_class, send_email_task
    ):
        use_case_class.return_value.execute.return_value = PasswordResetRequested(
            email="nika@example.com", token="reset-token-123"
        )

        response = APIClient().post(
            "/api/auth/password-reset/",
            {"email": "nika@example.com"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "message": "If an account exists, a reset link has been sent."
        }
        args, _ = send_email_task.delay.call_args
        assert args[0] == "nika@example.com"
        assert "reset-token-123" in args[2]

    @patch("apps.authentication.api.views.send_email_task")
    @patch("apps.authentication.api.views.RequestPasswordResetUseCase")
    def test_password_reset_request_returns_the_same_response_for_an_unknown_email(
        self, use_case_class, send_email_task
    ):
        use_case_class.return_value.execute.return_value = None

        response = APIClient().post(
            "/api/auth/password-reset/",
            {"email": "ghost@example.com"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "message": "If an account exists, a reset link has been sent."
        }
        send_email_task.delay.assert_not_called()

    @patch("apps.authentication.api.views.ConfirmPasswordResetUseCase")
    def test_password_reset_confirm_succeeds_with_a_valid_token(self, use_case_class):
        use_case_class.return_value.execute.return_value = None

        response = APIClient().post(
            "/api/auth/password-reset/confirm/",
            {"token": "reset-token-123", "new_password": "Tr0ub4dor-2026"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {
            "message": "Your password has been reset successfully."
        }

    @patch("apps.authentication.api.views.ConfirmPasswordResetUseCase")
    def test_password_reset_confirm_rejects_an_invalid_or_expired_token(
        self, use_case_class
    ):
        use_case_class.return_value.execute.side_effect = (
            InvalidPasswordResetTokenError(
                "This password reset link is invalid or has expired."
            )
        )

        response = APIClient().post(
            "/api/auth/password-reset/confirm/",
            {"token": "garbage", "new_password": "Tr0ub4dor-2026"},
            format="json",
        )

        assert response.status_code == 400

    @patch("apps.authentication.api.views.ConfirmPasswordResetUseCase")
    def test_password_reset_confirm_rejects_a_weak_new_password(self, use_case_class):
        use_case_class.return_value.execute.side_effect = PasswordResetValidationError(
            "This password is too common."
        )

        response = APIClient().post(
            "/api/auth/password-reset/confirm/",
            {"token": "reset-token-123", "new_password": "password123"},
            format="json",
        )

        assert response.status_code == 400


class TestUserModel:
    def test_username_and_email_are_unique(self):
        from apps.authentication.models import User

        assert User._meta.get_field("username").unique is True
        assert User._meta.get_field("email").unique is True
