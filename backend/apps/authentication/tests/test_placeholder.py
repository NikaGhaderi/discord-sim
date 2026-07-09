def test_authentication_app_is_wired_up():
    """Smoke test confirming the app package imports cleanly under pytest-django."""
    from apps.authentication.apps import AuthenticationConfig

    assert AuthenticationConfig.label == "authentication"
