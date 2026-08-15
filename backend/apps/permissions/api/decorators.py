from typing import Callable
from functools import wraps
from rest_framework.exceptions import PermissionDenied

from ..domain.permissions import PermissionCode
from ..domain.checker import has_permission


def require_permission(code: PermissionCode, get_granted_permissions: Callable):
    """
    A decorator for DRF view methods (post, patch, delete, etc.) to enforce permissions.

    :param code: The PermissionCode required to execute the view method.
    :param get_granted_permissions: A callable provided by the consuming app that
                                    extracts the user's granted permissions.
                                    It will be passed (self, request, *args, **kwargs).
    """

    def decorator(view_method):
        @wraps(view_method)
        def wrapper(self, request, *args, **kwargs):
            # self is the view instance; kwargs holds URL params like channel_id
            granted = get_granted_permissions(self, request, *args, **kwargs)

            if not has_permission(granted=granted, required=code):
                raise PermissionDenied(
                    f"You do not have the required permission: {code.value}"
                )

            return view_method(self, request, *args, **kwargs)

        return wrapper

    return decorator
