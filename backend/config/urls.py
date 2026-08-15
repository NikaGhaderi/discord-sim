from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.api.urls")),
    path("api/users/", include("apps.users.api.urls")),
    path("api/", include("apps.private_spaces.api.urls")),
    path("api/", include("apps.messaging.api.urls")),
    path("api/notifications/", include("apps.notifications.api.urls")),
    path("", include("apps.workspaces.api.urls")),
]

# Local dev never hits this -- nginx intercepts /media/ before it reaches
# Django there. A plain single-container deploy (no nginx in front, e.g.
# Railway) has nothing else to serve uploaded media, so fall back to
# Django serving it directly whenever S3 storage isn't configured. Not
# scale-appropriate (it blocks a worker thread per file, no far-future
# caching headers), but a persistent Railway Volume mounted at MEDIA_ROOT
# plus this route is enough to keep uploads working without paying for
# S3-compatible storage.
if not settings.USE_S3_MEDIA:
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            serve_static,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
