from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
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
from apps.private_spaces.models import DirectChat, Group, GroupInvitation, GroupMember
from apps.users.models import Profile


def _detail(message, status_code):
    return Response({"detail": message}, status=status_code)


class DirectChatListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        chats = DirectChat.objects.filter(
            Q(user1_id=request.user.id) | Q(user2_id=request.user.id)
        )
        return Response(DirectChatSerializer(chats, many=True).data, status=200)

    def post(self, request):
        serializer = CreateDirectChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_user_id = serializer.validated_data["target_user_id"]

        if target_user_id == request.user.id:
            return _detail("A direct chat requires two different users.", 400)
        if not get_user_model().objects.filter(pk=target_user_id).exists():
            return _detail("Target user not found.", 404)

        user1_id, user2_id = sorted((request.user.id, target_user_id))
        try:
            with transaction.atomic():
                chat, created = DirectChat.objects.get_or_create(
                    user1_id=user1_id,
                    user2_id=user2_id,
                )
        except IntegrityError:
            chat = DirectChat.objects.get(
                user1_id=user1_id,
                user2_id=user2_id,
            )
            created = False

        return Response(
            DirectChatSerializer(chat).data,
            status=201 if created else 200,
        )


class DirectChatDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, dm_id):
        chat = (
            DirectChat.objects.filter(pk=dm_id)
            .filter(Q(user1_id=request.user.id) | Q(user2_id=request.user.id))
            .first()
        )
        if chat is None:
            return _detail("Direct chat not found.", 404)
        chat.delete()
        return Response(status=204)


class GroupListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = Group.objects.filter(memberships__user_id=request.user.id).distinct()
        return Response(GroupSerializer(groups, many=True).data, status=200)

    def post(self, request):
        serializer = CreateGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            group = Group.objects.create(
                name=serializer.validated_data["name"],
                creator_id=request.user.id,
            )
            GroupMember.objects.create(
                group=group,
                user_id=request.user.id,
                is_admin=True,
            )
        return Response(GroupSerializer(group).data, status=201)


class GroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _member_group(group_id, user_id):
        return Group.objects.filter(
            pk=group_id,
            memberships__user_id=user_id,
        ).first()

    def patch(self, request, group_id):
        group = self._member_group(group_id, request.user.id)
        if group is None:
            return _detail("Group not found.", 404)
        serializer = UpdateGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group.name = serializer.validated_data["name"]
        group.save(update_fields=("name",))
        return Response(GroupSerializer(group).data, status=200)

    def delete(self, request, group_id):
        group = self._member_group(group_id, request.user.id)
        if group is None:
            return _detail("Group not found.", 404)
        group.delete()
        return Response(status=204)


class LeaveGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id):
        membership = GroupMember.objects.filter(
            group_id=group_id,
            user_id=request.user.id,
        ).first()
        if membership is None:
            return _detail("Group membership not found.", 404)
        membership.delete()
        return Response(status=204)


class GroupInvitationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        if not GroupMember.objects.filter(
            group_id=group_id,
            user_id=request.user.id,
        ).exists():
            return _detail("Group not found.", 404)

        serializer = CreateInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitee_id = serializer.validated_data["invitee_id"]
        invitee = get_user_model().objects.filter(pk=invitee_id).first()
        if invitee is None:
            return _detail("Invitee not found.", 404)
        if not Profile.objects.filter(
            user_id=invitee_id,
            allow_group_invitations=True,
        ).exists():
            return _detail("This user does not allow group invitations.", 403)
        if GroupMember.objects.filter(group_id=group_id, user_id=invitee_id).exists():
            return _detail("This user is already a group member.", 400)

        try:
            with transaction.atomic():
                invitation, created = GroupInvitation.objects.get_or_create(
                    group_id=group_id,
                    invitee_id=invitee_id,
                    status=GroupInvitation.Status.PENDING,
                    defaults={"inviter_id": request.user.id},
                )
        except IntegrityError:
            invitation = GroupInvitation.objects.get(
                group_id=group_id,
                invitee_id=invitee_id,
                status=GroupInvitation.Status.PENDING,
            )
            created = False

        return Response(
            GroupInvitationSerializer(invitation).data,
            status=201 if created else 200,
        )


class GroupInvitationResponseView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, invitation_id):
        serializer = RespondInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            invitation = (
                GroupInvitation.objects.select_for_update()
                .filter(
                    pk=invitation_id,
                    invitee_id=request.user.id,
                    status=GroupInvitation.Status.PENDING,
                )
                .first()
            )
            if invitation is None:
                return _detail("Pending invitation not found.", 404)

            invitation.status = serializer.validated_data["status"]
            invitation.save(update_fields=("status",))
            if invitation.status == GroupInvitation.Status.ACCEPTED:
                GroupMember.objects.get_or_create(
                    group=invitation.group,
                    user_id=request.user.id,
                    defaults={"is_admin": False},
                )

        return Response(InvitationResponseSerializer(invitation).data, status=200)
