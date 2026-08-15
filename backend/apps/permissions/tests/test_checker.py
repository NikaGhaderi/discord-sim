import pytest

from ..domain.checker import (
    has_permission,
    has_any_permission,
    has_all_permissions,
)


class TestHasPermission:
    def test_granted_permission_returns_true(self):
        granted = ["MANAGE_TOPICS", "SEND_MEDIA"]
        assert has_permission(granted, "MANAGE_TOPICS") is True

    def test_missing_permission_returns_false(self):
        granted = ["SEND_MEDIA"]
        assert has_permission(granted, "MANAGE_TOPICS") is False

    def test_empty_granted_returns_false(self):
        granted = []
        assert has_permission(granted, "MANAGE_TOPICS") is False

    def test_invalid_permission_string_raises_value_error(self):
        granted = ["MANAGE_TOPICS"]
        with pytest.raises(ValueError, match="is not a valid PermissionCode"):
            has_permission(granted, "MANAGE_TOPCIS")


class TestHasAnyPermission:
    def test_has_one_required_permission_returns_true(self):
        granted = ["MANAGE_TOPICS", "SEND_MEDIA"]
        required = ["KICK_MEMBERS", "MANAGE_TOPICS"]
        assert has_any_permission(granted, required) is True

    def test_has_all_required_permissions_returns_true(self):
        granted = ["MANAGE_TOPICS", "KICK_MEMBERS", "SEND_MEDIA"]
        required = ["KICK_MEMBERS", "MANAGE_TOPICS"]
        assert has_any_permission(granted, required) is True

    def test_has_no_required_permissions_returns_false(self):
        granted = ["SEND_MEDIA"]
        required = ["KICK_MEMBERS", "MANAGE_TOPICS"]
        assert has_any_permission(granted, required) is False

    def test_invalid_permission_string_in_required_raises_value_error(self):
        granted = ["MANAGE_TOPICS"]
        required = ["MANAGE_TOPICS", "INVALID_CODE"]
        with pytest.raises(ValueError, match="is not a valid PermissionCode"):
            has_any_permission(granted, required)


class TestHasAllPermissions:
    def test_has_exact_required_permissions_returns_true(self):
        granted = ["MANAGE_TOPICS", "SEND_MEDIA"]
        required = ["MANAGE_TOPICS", "SEND_MEDIA"]
        assert has_all_permissions(granted, required) is True

    def test_has_more_than_required_permissions_returns_true(self):
        granted = ["MANAGE_TOPICS", "SEND_MEDIA", "KICK_MEMBERS"]
        required = ["MANAGE_TOPICS", "SEND_MEDIA"]
        assert has_all_permissions(granted, required) is True

    def test_missing_some_required_permissions_returns_false(self):
        granted = ["MANAGE_TOPICS"]
        required = ["MANAGE_TOPICS", "SEND_MEDIA"]
        assert has_all_permissions(granted, required) is False

    def test_empty_granted_returns_false(self):
        granted = []
        required = ["MANAGE_TOPICS"]
        assert has_all_permissions(granted, required) is False

    def test_invalid_permission_string_in_required_raises_value_error(self):
        granted = ["MANAGE_TOPICS", "SEND_MEDIA"]
        required = ["MANAGE_TOPICS", "INVALID_CODE"]
        with pytest.raises(ValueError, match="is not a valid PermissionCode"):
            has_all_permissions(granted, required)
