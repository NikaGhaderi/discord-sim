def test_notifications_app_is_wired_up():
    """Smoke test confirming the app package imports cleanly under pytest-django."""
    from apps.notifications.apps import NotificationsConfig

    assert NotificationsConfig.label == "notifications"
