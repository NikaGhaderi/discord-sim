from apps.permissions.domain.permissions import PermissionCode
from apps.workspaces.domain.exceptions import (
    InsufficientPermissionsError,
    InvalidPermissionCodeError,
)

_VALID_CODES = {code.value for code in PermissionCode}


def validate_permission_codes(permissions: list[str]) -> None:
    unknown = [p for p in permissions if p not in _VALID_CODES]
    if unknown:
        raise InvalidPermissionCodeError(
            f"Unknown permission code(s): {', '.join(unknown)}"
        )


def ensure_permissions_subset(requested: list[str], granted: list[str]) -> None:
    """A role can never grant more than its creator/assigner already holds."""
    excess = set(requested) - set(granted)
    if excess:
        raise InsufficientPermissionsError(
            f"Cannot grant permission(s) you don't hold: {', '.join(sorted(excess))}"
        )
