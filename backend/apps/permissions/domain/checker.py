from typing import Iterable
from .permissions import PermissionCode


def _validate_permission_code(permission: str) -> None:
    """
    Validates that a string is a recognized PermissionCode.
    Raises ValueError if the permission is unknown.
    """
    try:
        PermissionCode(permission)
    except ValueError:
        raise ValueError(f"'{permission}' is not a valid PermissionCode.")


def has_permission(granted: Iterable[str], required: str) -> bool:
    """
    Checks if a single required permission is in the granted iterable.
    """
    _validate_permission_code(required)
    return required in granted


def has_any_permission(granted: Iterable[str], required: Iterable[str]) -> bool:
    """
    Checks if at least one of the required permissions is in the granted iterable.
    """
    for req in required:
        _validate_permission_code(req)

    granted_set = set(granted)
    return any(req in granted_set for req in required)


def has_all_permissions(granted: Iterable[str], required: Iterable[str]) -> bool:
    """
    Checks if all of the required permissions are in the granted permissions.
    """
    for req in required:
        _validate_permission_code(req)

    granted_set = set(granted)
    required_set = set(required)

    return required_set.issubset(granted_set)
