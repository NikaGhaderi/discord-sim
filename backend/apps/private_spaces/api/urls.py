from django.urls import path

from apps.private_spaces.api import views


app_name = "private_spaces"

urlpatterns = [
    path("dms/", views.DirectChatListCreateView.as_view(), name="dm-list-create"),
    path("dms/<int:dm_id>/", views.DirectChatDetailView.as_view(), name="dm-detail"),
    path("groups/", views.GroupListCreateView.as_view(), name="group-list-create"),
    path(
        "groups/<int:group_id>/",
        views.GroupDetailView.as_view(),
        name="group-detail",
    ),
    path(
        "groups/<int:group_id>/members/",
        views.GroupMemberListView.as_view(),
        name="group-member-list",
    ),
    path(
        "groups/<int:group_id>/leave/",
        views.LeaveGroupView.as_view(),
        name="group-leave",
    ),
    path(
        "groups/<int:group_id>/invitations/",
        views.GroupInvitationCreateView.as_view(),
        name="group-invitation-create",
    ),
    path(
        "invitations/",
        views.InvitationListView.as_view(),
        name="invitation-list",
    ),
    path(
        "invitations/<int:invitation_id>/",
        views.GroupInvitationResponseView.as_view(),
        name="group-invitation-response",
    ),
]
