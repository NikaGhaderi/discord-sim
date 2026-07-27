from django.urls import path

from . import views


app_name = "authentication"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path(
        "verify-2fa/",
        views.VerifyTwoFactorView.as_view(),
        name="verify-two-factor",
    ),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("refresh/", views.TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "password-reset/",
        views.RequestPasswordResetView.as_view(),
        name="password-reset",
    ),
    path(
        "password-reset/confirm/",
        views.ConfirmPasswordResetView.as_view(),
        name="password-reset-confirm",
    ),
]
