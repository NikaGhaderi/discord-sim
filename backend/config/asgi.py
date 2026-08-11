import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

django_asgi_app = get_asgi_application()

# Imported after django_asgi_app so app registry is populated before routing modules
# that reference models are imported.
from apps.messaging.api.routing import (  # noqa: E402
    websocket_urlpatterns as messaging_ws,
)
from apps.notifications.api.routing import (  # noqa: E402
    websocket_urlpatterns as notifications_ws,
)
from core.ws_auth import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(URLRouter(messaging_ws + notifications_ws)),
    }
)
