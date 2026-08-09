from rest_framework import serializers

from apps.private_spaces.models import DirectChat, Group, GroupInvitation


# TODO(private-spaces): the doc (§8-3-1) says list responses should show
# participant/member profile pictures. Not implemented here -- deferred
# pending real avatar/media support (SCRUM-46). See SCRUM-24 comment.
class DirectChatSerializer(serializers.ModelSerializer):
    direct_chat_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = DirectChat
        fields = ("direct_chat_id", "user1_id", "user2_id", "created_at")


class CreateDirectChatSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(min_value=1)


# TODO(private-spaces): same profile-picture gap as DirectChatSerializer above.
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
