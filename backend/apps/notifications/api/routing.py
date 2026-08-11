from apps.notifications.api.consumers import NotificationConsumer
from django.urls import re_path

websocket_urlpatterns = [
    re_path(r"ws/stream/$", NotificationConsumer.as_asgi()),
]
