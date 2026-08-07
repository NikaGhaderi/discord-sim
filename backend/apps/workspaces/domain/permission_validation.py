from apps.permissions.domain.permissions import PermissionCode
from apps.workspaces.domain.exceptions import InvalidPermissionCodeError

_VALID_CODES = {code.value for code in PermissionCode}


def validate_permission_codes(permissions: list[str]) -> None:
    unknown = [p for p in permissions if p not in _VALID_CODES]
    if unknown:
        raise InvalidPermissionCodeError(
            f"Unknown permission code(s): {', '.join(unknown)}"
        )
