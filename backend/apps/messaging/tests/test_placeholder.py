def test_messaging_app_is_wired_up():
    """Smoke test confirming the app package imports cleanly under pytest-django."""
    from apps.messaging.apps import MessagingConfig

    assert MessagingConfig.label == "messaging"
