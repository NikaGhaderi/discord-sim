from types import SimpleNamespace
from unittest.mock import patch

from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.api.views import LogoutView
from apps.authentication.application.use_cases.login import (
    AuthenticatedUser,
    Requires2FA,
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

    @patch("apps.authentication.api.views.print")
    @patch("apps.authentication.api.views.LoginUseCase")
    def test_login_prints_two_factor_code_and_returns_temp_token(
        self, use_case_class, debug_print
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
        debug_print.assert_called_once_with("DEBUG: 2FA Code is 123456")

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


class TestUserModel:
    def test_username_and_email_are_unique(self):
        from apps.authentication.models import User

        assert User._meta.get_field("username").unique is True
        assert User._meta.get_field("email").unique is True
