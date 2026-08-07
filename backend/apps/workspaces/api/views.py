from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.permissions.api.decorators import require_permission
from apps.permissions.domain.permissions import PermissionCode

from apps.workspaces.application.use_cases.assign_role import AssignRoleUseCase
from apps.workspaces.application.use_cases.create_channel import CreateChannelUseCase
from apps.workspaces.application.use_cases.create_role import CreateRoleUseCase
from apps.workspaces.application.use_cases.create_topic import CreateTopicUseCase
from apps.workspaces.application.use_cases.delete_channel import DeleteChannelUseCase
from apps.workspaces.application.use_cases.delete_role import DeleteRoleUseCase
from apps.workspaces.application.use_cases.delete_topic import DeleteTopicUseCase
from apps.workspaces.application.use_cases.get_channel import GetChannelUseCase
from apps.workspaces.application.use_cases.get_topic import GetTopicUseCase
from apps.workspaces.application.use_cases.join_channel import JoinChannelUseCase
from apps.workspaces.application.use_cases.join_channel_by_invite_token import (
    JoinChannelByInviteTokenUseCase,
)
from apps.workspaces.application.use_cases.kick_member import KickMemberUseCase
from apps.workspaces.application.use_cases.leave_channel import LeaveChannelUseCase
from apps.workspaces.application.use_cases.list_channels import ListChannelsUseCase
from apps.workspaces.application.use_cases.list_members import ListMembersUseCase
from apps.workspaces.application.use_cases.list_roles import ListRolesUseCase
from apps.workspaces.application.use_cases.update_channel import UpdateChannelUseCase
from apps.workspaces.application.use_cases.update_member_nickname import (
    UpdateMemberNicknameUseCase,
)
from apps.workspaces.application.use_cases.update_role import UpdateRoleUseCase

from apps.workspaces.domain.exceptions import (
    AlreadyChannelMemberError,
    CannotKickChannelOwnerError,
    ChannelMemberNotFoundError,
    ChannelNotFoundError,
    ChannelRoleNotFoundError,
    DuplicateRoleNameError,
    InsufficientPermissionsError,
    InvalidPermissionCodeError,
    LastTopicDeletionError,
    OwnerRoleImmutableError,
    TopicNotFoundError,
)
from apps.workspaces.repositories import DjangoChannelRepository

from .serializers import (
    AssignRoleSerializer,
    ChannelMemberSerializer,
    ChannelRoleSerializer,
    ChannelSerializer,
    CreateChannelSerializer,
    CreateRoleSerializer,
    CreateTopicSerializer,
    JoinChannelSerializer,
    TopicSerializer,
    UpdateChannelSerializer,
    UpdateNicknameSerializer,
    UpdateRoleSerializer,
    UserChannelRoleSerializer,
)


def get_granted_permissions(view, request, *args, **kwargs):
    channel_id = kwargs.get("channel_id")
    if channel_id is None:
        return []
    return DjangoChannelRepository().get_user_permissions(channel_id, request.user.id)


def _channel_not_found_response():
    return Response({"detail": "Channel not found."}, status=404)


def _topic_not_found_response():
    return Response({"detail": "Topic not found."}, status=404)


def _member_not_found_response():
    return Response({"detail": "User is not a member of this channel."}, status=404)


def _role_not_found_response():
    return Response({"detail": "Role not found."}, status=404)


class ChannelDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, channel_id):
        try:
            channel = GetChannelUseCase(DjangoChannelRepository()).execute(channel_id)
        except ChannelNotFoundError:
            return _channel_not_found_response()
        return Response(ChannelSerializer(channel).data, status=200)

    @require_permission(
        code=PermissionCode.MANAGE_CHANNEL,
        get_granted_permissions=get_granted_permissions,
    )
    def patch(self, request, channel_id):
        serializer = UpdateChannelSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            channel = UpdateChannelUseCase(DjangoChannelRepository()).execute(
                channel_id,
                **serializer.validated_data,
            )
        except ChannelNotFoundError:
            return _channel_not_found_response()

        return Response(ChannelSerializer(channel).data, status=200)

    @require_permission(
        code=PermissionCode.MANAGE_CHANNEL,
        get_granted_permissions=get_granted_permissions,
    )
    def delete(self, request, channel_id):
        try:
            DeleteChannelUseCase(DjangoChannelRepository()).execute(channel_id)
        except ChannelNotFoundError:
            return _channel_not_found_response()

        return Response(status=204)


class ChannelListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        channels = ListChannelsUseCase(DjangoChannelRepository()).execute(
            request.user.id
        )
        return Response(ChannelSerializer(channels, many=True).data, status=200)

    def post(self, request):
        serializer = CreateChannelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        channel = CreateChannelUseCase(DjangoChannelRepository()).execute(
            creator_id=request.user.id,
            **serializer.validated_data,
        )
        return Response(ChannelSerializer(channel).data, status=201)


class ChannelTopics(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, channel_id, topic_id):
        try:
            topic = GetTopicUseCase(DjangoChannelRepository()).execute(topic_id)
        except TopicNotFoundError:
            return _topic_not_found_response()
        if topic.channel_id != channel_id:
            return _topic_not_found_response()
        return Response(TopicSerializer(topic).data, status=200)

    @require_permission(
        code=PermissionCode.MANAGE_TOPICS,
        get_granted_permissions=get_granted_permissions,
    )
    def post(self, request, channel_id):
        serializer = CreateTopicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            topic = CreateTopicUseCase(DjangoChannelRepository()).execute(
                channel_id,
                **serializer.validated_data,
            )
        except ChannelNotFoundError:
            return _channel_not_found_response()
        return Response(TopicSerializer(topic).data, status=201)

    @require_permission(
        code=PermissionCode.MANAGE_TOPICS,
        get_granted_permissions=get_granted_permissions,
    )
    def delete(self, request, channel_id, topic_id):
        try:
            DeleteTopicUseCase(DjangoChannelRepository()).execute(topic_id)
        except TopicNotFoundError:
            return _topic_not_found_response()
        except LastTopicDeletionError as exc:
            return Response({"detail": str(exc)}, status=409)

        return Response(status=204)


class ChannelJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, channel_id):
        serializer = JoinChannelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            member = JoinChannelUseCase(DjangoChannelRepository()).execute(
                channel_id, request.user.id, **serializer.validated_data
            )
        except ChannelNotFoundError:
            return _channel_not_found_response()
        except AlreadyChannelMemberError as exc:
            return Response({"detail": str(exc)}, status=409)

        return Response(ChannelMemberSerializer(member).data, status=201)


class ChannelInviteJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invite_token):
        serializer = JoinChannelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            member = JoinChannelByInviteTokenUseCase(DjangoChannelRepository()).execute(
                invite_token, request.user.id, **serializer.validated_data
            )
        except ChannelNotFoundError:
            return _channel_not_found_response()
        except AlreadyChannelMemberError as exc:
            return Response({"detail": str(exc)}, status=409)

        return Response(ChannelMemberSerializer(member).data, status=201)


class ChannelLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, channel_id):
        LeaveChannelUseCase(DjangoChannelRepository()).execute(
            channel_id, request.user.id
        )
        return Response(status=204)


class ChannelMemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, channel_id):
        members = ListMembersUseCase(DjangoChannelRepository()).execute(channel_id)
        return Response(ChannelMemberSerializer(members, many=True).data, status=200)


class ChannelMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @require_permission(
        code=PermissionCode.KICK_MEMBERS,
        get_granted_permissions=get_granted_permissions,
    )
    def delete(self, request, channel_id, user_id):
        try:
            KickMemberUseCase(DjangoChannelRepository()).execute(channel_id, user_id)
        except ChannelMemberNotFoundError:
            return _member_not_found_response()
        except CannotKickChannelOwnerError as exc:
            return Response({"detail": str(exc)}, status=403)

        return Response(status=204)

    def patch(self, request, channel_id, user_id):
        # Self-service only -- a member may rename themselves, nobody else.
        if request.user.id != user_id:
            return Response(
                {"detail": "You can only update your own nickname."}, status=403
            )

        serializer = UpdateNicknameSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            member = UpdateMemberNicknameUseCase(DjangoChannelRepository()).execute(
                channel_id, user_id, **serializer.validated_data
            )
        except ChannelMemberNotFoundError:
            return _member_not_found_response()

        return Response(ChannelMemberSerializer(member).data, status=200)


class ChannelRoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, channel_id):
        roles = ListRolesUseCase(DjangoChannelRepository()).execute(channel_id)
        return Response(ChannelRoleSerializer(roles, many=True).data, status=200)

    @require_permission(
        code=PermissionCode.MANAGE_ROLES,
        get_granted_permissions=get_granted_permissions,
    )
    def post(self, request, channel_id):
        serializer = CreateRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            role = CreateRoleUseCase(DjangoChannelRepository()).execute(
                channel_id, requester_id=request.user.id, **serializer.validated_data
            )
        except InvalidPermissionCodeError as exc:
            return Response({"detail": str(exc)}, status=400)
        except InsufficientPermissionsError as exc:
            return Response({"detail": str(exc)}, status=403)
        except DuplicateRoleNameError as exc:
            return Response({"detail": str(exc)}, status=409)

        return Response(ChannelRoleSerializer(role).data, status=201)


class ChannelRoleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @require_permission(
        code=PermissionCode.MANAGE_ROLES,
        get_granted_permissions=get_granted_permissions,
    )
    def patch(self, request, channel_id, role_id):
        serializer = UpdateRoleSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            role = UpdateRoleUseCase(DjangoChannelRepository()).execute(
                role_id, requester_id=request.user.id, **serializer.validated_data
            )
        except ChannelRoleNotFoundError:
            return _role_not_found_response()
        except InvalidPermissionCodeError as exc:
            return Response({"detail": str(exc)}, status=400)
        except InsufficientPermissionsError as exc:
            return Response({"detail": str(exc)}, status=403)
        except OwnerRoleImmutableError as exc:
            return Response({"detail": str(exc)}, status=403)

        return Response(ChannelRoleSerializer(role).data, status=200)

    @require_permission(
        code=PermissionCode.MANAGE_ROLES,
        get_granted_permissions=get_granted_permissions,
    )
    def delete(self, request, channel_id, role_id):
        try:
            DeleteRoleUseCase(DjangoChannelRepository()).execute(role_id)
        except ChannelRoleNotFoundError:
            return _role_not_found_response()
        except OwnerRoleImmutableError as exc:
            return Response({"detail": str(exc)}, status=403)

        return Response(status=204)


class ChannelMemberRoleView(APIView):
    permission_classes = [IsAuthenticated]

    @require_permission(
        code=PermissionCode.MANAGE_ROLES,
        get_granted_permissions=get_granted_permissions,
    )
    def post(self, request, channel_id, user_id):
        serializer = AssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user_role = AssignRoleUseCase(DjangoChannelRepository()).execute(
                channel_id,
                requester_id=request.user.id,
                user_id=user_id,
                **serializer.validated_data,
            )
        except ChannelMemberNotFoundError:
            return _member_not_found_response()
        except ChannelRoleNotFoundError:
            return _role_not_found_response()
        except InsufficientPermissionsError as exc:
            return Response({"detail": str(exc)}, status=403)

        return Response(UserChannelRoleSerializer(user_role).data, status=201)
