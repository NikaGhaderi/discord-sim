from django.urls import path

from apps.users.api import views


app_name = "users"

urlpatterns = [
    path("me/profile/", views.OwnProfileView.as_view(), name="own-profile"),
    path("me/avatar/", views.UploadAvatarView.as_view(), name="upload-avatar"),
    path("by-ids/", views.UsersByIdsView.as_view(), name="users-by-ids"),
    path(
        "<str:username>/profile/",
        views.PublicProfileView.as_view(),
        name="public-profile",
    ),
]
