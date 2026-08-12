from django.urls import path

from apps.messaging.api import views


app_name = "messaging"

urlpatterns = [
    path("messages/", views.MessageListCreateView.as_view(), name="message-list"),
    path("messages/search/", views.MessageSearchView.as_view(), name="message-search"),
    path(
        "messages/scheduled/",
        views.ScheduledMessageCreateView.as_view(),
        name="scheduled-message-create",
    ),
    path(
        "messages/scheduled/<int:scheduled_id>/",
        views.ScheduledMessageDetailView.as_view(),
        name="scheduled-message-detail",
    ),
    path(
        "messages/<int:base_message_id>/",
        views.MessageDetailView.as_view(),
        name="message-detail",
    ),
    path(
        "messages/<int:base_message_id>/media/",
        views.MessageMediaView.as_view(),
        name="message-media",
    ),
]
