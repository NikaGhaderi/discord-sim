from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.utils.urls import remove_query_param, replace_query_param
from rest_framework.views import APIView

from apps.private_spaces.api.serializers import (
    CreateDirectChatSerializer,
    CreateGroupSerializer,
    CreateInvitationSerializer,
    DirectChatSerializer,
    GroupInvitationSerializer,
    GroupMemberSerializer,
    GroupSerializer,
    InvitationQuerySerializer,
    InvitationResponseSerializer,
    RespondInvitationSerializer,
    UpdateGroupSerializer,
)
from apps.private_spaces.application.use_cases.direct_chats import (
    CreateOrGetDirectChatUseCase,
    DeleteDirectChatUseCase,
    ListDirectChatsUseCase,
)
from apps.private_spaces.application.use_cases.groups import (
    CreateGroupUseCase,
    DeleteGroupUseCase,
    GetGroupUseCase,
    JoinGroupByInviteTokenUseCase,
    LeaveGroupUseCase,
    ListGroupMembersUseCase,
    ListGroupsUseCase,
    UpdateGroupUseCase,
)
from apps.private_spaces.application.use_cases.invitations import (
    ListMyInvitationsUseCase,
    RespondToInvitationUseCase,
    SendGroupInvitationUseCase,
)
from apps.private_spaces.domain.exceptions import (
    AlreadyGroupMemberError,
    DirectChatNotFoundError,
    GroupMembershipNotFoundError,
    GroupNotFoundError,
    InvitationNotFoundError,
    InvitationsDisabledError,
    InviteeNotFoundError,
    SelfDirectChatError,
    UserNotFoundError,
)
from apps.private_spaces.repositories import DjangoPrivateSpacesRepository
from apps.notifications.recorder import DjangoNotificationRecorder
from apps.users.repositories import DjangoProfileRepository


def _detail(message, status_code):
    return Response({"detail": message}, status=status_code)


def _page_response(request, page, limit, offset):
    url = request.build_absolute_uri()

    next_url = None
    if offset + limit < page.count:
        next_url = replace_query_param(url, "limit", limit)
        next_url = replace_query_param(next_url, "offset", offset + limit)

    previous_url = None
    if offset > 0:
        previous_offset = max(offset - limit, 0)
        previous_url = replace_query_param(url, "limit", limit)
        if previous_offset == 0:
            previous_url = remove_query_param(previous_url, "offset")
        else:
            previous_url = replace_query_param(previous_url, "offset", previous_offset)

    return Response(
        {
            "count": page.count,
            "next": next_url,
            "previous": previous_url,
            "results": GroupInvitationSerializer(page.results, many=True).data,
        },
        status=200,
    )


class DirectChatListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        chats = ListDirectChatsUseCase(DjangoPrivateSpacesRepository()).execute(
            request.user.id
        )
        return Response(DirectChatSerializer(chats, many=True).data, status=200)

    def post(self, request):
        serializer = CreateDirectChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            chat, created = CreateOrGetDirectChatUseCase(
                DjangoPrivateSpacesRepository()
            ).execute(
                user_id=request.user.id,
                target_user_id=serializer.validated_data["target_user_id"],
            )
        except SelfDirectChatError as exc:
            return _detail(str(exc), 400)
        except UserNotFoundError as exc:
            return _detail(str(exc), 404)

        return Response(DirectChatSerializer(chat).data, status=201 if created else 200)


class DirectChatDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, dm_id):
        try:
            DeleteDirectChatUseCase(DjangoPrivateSpacesRepository()).execute(
                dm_id=dm_id, requesting_user_id=request.user.id
            )
        except DirectChatNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(status=204)


class GroupListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = ListGroupsUseCase(DjangoPrivateSpacesRepository()).execute(
            request.user.id
        )
        return Response(GroupSerializer(groups, many=True).data, status=200)

    def post(self, request):
        serializer = CreateGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = CreateGroupUseCase(DjangoPrivateSpacesRepository()).execute(
            user_id=request.user.id, name=serializer.validated_data["name"]
        )
        return Response(GroupSerializer(group).data, status=201)


class GroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        try:
            group = GetGroupUseCase(DjangoPrivateSpacesRepository()).execute(
                group_id=group_id, user_id=request.user.id
            )
        except GroupNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(GroupSerializer(group).data, status=200)

    def patch(self, request, group_id):
        serializer = UpdateGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            group = UpdateGroupUseCase(DjangoPrivateSpacesRepository()).execute(
                group_id=group_id,
                user_id=request.user.id,
                name=serializer.validated_data["name"],
            )
        except GroupNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(GroupSerializer(group).data, status=200)

    def delete(self, request, group_id):
        try:
            DeleteGroupUseCase(DjangoPrivateSpacesRepository()).execute(
                group_id=group_id, user_id=request.user.id
            )
        except GroupNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(status=204)


class GroupJoinByInviteTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invite_token):
        try:
            group = JoinGroupByInviteTokenUseCase(
                DjangoPrivateSpacesRepository()
            ).execute(invite_token=invite_token, user_id=request.user.id)
        except GroupNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(GroupSerializer(group).data, status=200)


class GroupMemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        try:
            members = ListGroupMembersUseCase(DjangoPrivateSpacesRepository()).execute(
                group_id=group_id, user_id=request.user.id
            )
        except GroupNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(GroupMemberSerializer(members, many=True).data, status=200)


class LeaveGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id):
        try:
            LeaveGroupUseCase(
                DjangoPrivateSpacesRepository(), DjangoNotificationRecorder()
            ).execute(group_id=group_id, user_id=request.user.id)
        except GroupMembershipNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(status=204)


class GroupInvitationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        serializer = CreateInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            invitation, created = SendGroupInvitationUseCase(
                DjangoPrivateSpacesRepository(), DjangoProfileRepository()
            ).execute(
                group_id=group_id,
                inviter_id=request.user.id,
                invitee_id=serializer.validated_data["invitee_id"],
            )
        except GroupNotFoundError as exc:
            return _detail(str(exc), 404)
        except InviteeNotFoundError as exc:
            return _detail(str(exc), 404)
        except InvitationsDisabledError as exc:
            return _detail(str(exc), 403)
        except AlreadyGroupMemberError as exc:
            return _detail(str(exc), 400)

        return Response(
            GroupInvitationSerializer(invitation).data,
            status=201 if created else 200,
        )


class GroupInvitationResponseView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, invitation_id):
        serializer = RespondInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            invitation = RespondToInvitationUseCase(
                DjangoPrivateSpacesRepository(), DjangoNotificationRecorder()
            ).execute(
                invitation_id=invitation_id,
                user_id=request.user.id,
                status=serializer.validated_data["status"],
            )
        except InvitationNotFoundError as exc:
            return _detail(str(exc), 404)

        return Response(InvitationResponseSerializer(invitation).data, status=200)


class InvitationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = InvitationQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        page = ListMyInvitationsUseCase(DjangoPrivateSpacesRepository()).execute(
            request.user.id,
            limit=data["limit"],
            offset=data["offset"],
        )
        return _page_response(request, page, data["limit"], data["offset"])
