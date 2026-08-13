from rest_framework import serializers

from apps.private_spaces.models import DirectChat, Group, GroupInvitation


# The doc (§8-3-1) asks for participant profile pictures on list responses.
# Deliberately not embedded here -- this serializer only returns user1_id/
# user2_id, and the frontend bulk-resolves avatar_url (a plain URL field,
# unrelated to SCRUM-46's message-attachment media infra) via a separate
# profileApi.listPublicProfilesByIds call, see DirectMessageList.tsx.
class DirectChatSerializer(serializers.ModelSerializer):
    direct_chat_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = DirectChat
        fields = ("direct_chat_id", "user1_id", "user2_id", "created_at")


class CreateDirectChatSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(min_value=1)


# Same profile-picture note as DirectChatSerializer above -- member avatars
# are resolved by the frontend, see GroupSettingsPanel.tsx.
class GroupSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = Group
        fields = ("group_id", "name", "creator_id", "created_at")


class CreateGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, allow_blank=False)


class UpdateGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, allow_blank=False)


class CreateInvitationSerializer(serializers.Serializer):
    invitee_id = serializers.IntegerField(min_value=1)


class GroupInvitationSerializer(serializers.ModelSerializer):
    invitation_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = GroupInvitation
        fields = (
            "invitation_id",
            "group_id",
            "inviter_id",
            "invitee_id",
            "status",
            "created_at",
        )


class GroupMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)


class InvitationQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        required=False, default=50, min_value=1, max_value=100
    )
    offset = serializers.IntegerField(required=False, default=0, min_value=0)


class RespondInvitationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(
            GroupInvitation.Status.ACCEPTED,
            GroupInvitation.Status.DECLINED,
        )
    )


class InvitationResponseSerializer(serializers.ModelSerializer):
    invitation_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = GroupInvitation
        fields = ("invitation_id", "status")
