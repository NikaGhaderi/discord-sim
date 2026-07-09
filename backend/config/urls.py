from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.api.urls")),
    path("api/messaging/", include("apps.messaging.api.urls")),
    path("api/notifications/", include("apps.notifications.api.urls")),
]
