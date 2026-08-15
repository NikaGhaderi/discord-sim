from rest_framework import serializers


class ChannelSerializer(serializers.Serializer):
    channel_id = serializers.IntegerField(source="id", read_only=True)
    name = serializers.CharField(read_only=True)
    invite_token = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    creator_id = serializers.IntegerField(read_only=True)
    default_topic_id = serializers.IntegerField(read_only=True)


class TopicSerializer(serializers.Serializer):
    topic_id = serializers.IntegerField(source="id", read_only=True)
    title = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    channel_id = serializers.IntegerField(read_only=True)


class CreateChannelSerializer(serializers.Serializer):
    name = serializers.CharField()


class CreateTopicSerializer(serializers.Serializer):
    title = serializers.CharField()


class UpdateChannelSerializer(serializers.Serializer):
    name = serializers.CharField()


class ChannelMemberSerializer(serializers.Serializer):
    channel_id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    nickname_in_channel = serializers.CharField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)


class JoinChannelSerializer(serializers.Serializer):
    nickname_in_channel = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


class ChannelRoleSerializer(serializers.Serializer):
    role_id = serializers.IntegerField(source="id", read_only=True)
    channel_id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    permissions = serializers.ListField(child=serializers.CharField(), read_only=True)


class CreateRoleSerializer(serializers.Serializer):
    name = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())


class UpdateRoleSerializer(serializers.Serializer):
    permissions = serializers.ListField(child=serializers.CharField())


class UserChannelRoleSerializer(serializers.Serializer):
    userrole_id = serializers.IntegerField(source="id", read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    role_id = serializers.IntegerField(read_only=True)
    assigned_at = serializers.DateTimeField(read_only=True)


class AssignRoleSerializer(serializers.Serializer):
    role_id = serializers.IntegerField()


class UpdateNicknameSerializer(serializers.Serializer):
    nickname_in_channel = serializers.CharField(allow_blank=True)
