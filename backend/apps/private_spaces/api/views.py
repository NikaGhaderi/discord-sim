from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.private_spaces.api.serializers import (
    CreateDirectChatSerializer,
    CreateGroupSerializer,
    CreateInvitationSerializer,
    DirectChatSerializer,
    GroupInvitationSerializer,
    GroupSerializer,
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
    LeaveGroupUseCase,
    ListGroupsUseCase,
    UpdateGroupUseCase,
)
from apps.private_spaces.application.use_cases.invitations import (
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
from apps.users.repositories import DjangoProfileRepository


def _detail(message, status_code):
    return Response({"detail": message}, status=status_code)


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


class LeaveGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id):
        try:
            LeaveGroupUseCase(DjangoPrivateSpacesRepository()).execute(
                group_id=group_id, user_id=request.user.id
            )
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
                DjangoPrivateSpacesRepository()
            ).execute(
                invitation_id=invitation_id,
                user_id=request.user.id,
                status=serializer.validated_data["status"],
            )
        except InvitationNotFoundError as exc:
            return _detail(str(exc), 404)

        return Response(InvitationResponseSerializer(invitation).data, status=200)
