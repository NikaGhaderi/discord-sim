from django.urls import path

from . import views

app_name = "workspaces"

urlpatterns = [
    path("api/channels/", views.ChannelListView.as_view(), name="channel-list"),
    path(
        "api/channels/<int:channel_id>/",
        views.ChannelDetailView.as_view(),
        name="channel-detail",
    ),
    path(
        "api/channels/<int:channel_id>/join/",
        views.ChannelJoinView.as_view(),
        name="channel-join",
    ),
    path(
        "api/channels/<int:channel_id>/leave/",
        views.ChannelLeaveView.as_view(),
        name="channel-leave",
    ),
    path(
        "api/channels/invite/<str:invite_token>/join/",
        views.ChannelInviteJoinView.as_view(),
        name="channel-invite-join",
    ),
    path(
        "api/channels/<int:channel_id>/members/<int:user_id>/",
        views.ChannelMemberDetailView.as_view(),
        name="channel-member-detail",
    ),
    path(
        "api/channels/<int:channel_id>/members/<int:user_id>/roles/",
        views.ChannelMemberRoleView.as_view(),
        name="channel-member-roles",
    ),
    path(
        "api/channels/<int:channel_id>/roles/",
        views.ChannelRoleListView.as_view(),
        name="channel-role-list",
    ),
    path(
        "api/channels/<int:channel_id>/roles/<int:role_id>/",
        views.ChannelRoleDetailView.as_view(),
        name="channel-role-detail",
    ),
    path(
        "api/channels/<int:channel_id>/topics/<int:topic_id>/",
        views.ChannelTopics.as_view(),
        name="channel-topic-detail",
    ),
    path(
        "api/channels/<int:channel_id>/topics/",
        views.ChannelTopics.as_view(),
        name="channel-topic-list-create",
    ),
]
