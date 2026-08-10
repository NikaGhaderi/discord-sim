from django.urls import path

from apps.notifications.api import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path(
        "<int:notification_id>/",
        views.NotificationDetailView.as_view(),
        name="notification-detail",
    ),
]
