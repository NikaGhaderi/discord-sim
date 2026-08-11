"""JWT-over-WebSocket auth for Django Channels.

Browsers can't set a custom Authorization header on the WebSocket
handshake, so this reads the access token from a `?token=` query param
instead and resolves it the same way DRF's JWTAuthentication does for
HTTP requests -- just without going through DRF, since this runs before
any view. Channels' own AuthMiddlewareStack only reads Django session
cookies, which this project's auth doesn't use.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def _resolve_user(token: str):
    auth = JWTAuthentication()
    try:
        validated_token = auth.get_validated_token(token.encode())
        return auth.get_user(validated_token)
    except AuthenticationFailed:
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        scope["user"] = await _resolve_user(token) if token else AnonymousUser()
        return await self.app(scope, receive, send)
