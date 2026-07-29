from rest_framework import serializers


class OwnProfileSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    avatar_url = serializers.CharField(read_only=True)
    bio = serializers.CharField(read_only=True)
    allow_group_invitations = serializers.BooleanField(read_only=True)


class PublicProfileSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    avatar_url = serializers.CharField(read_only=True)
    bio = serializers.CharField(read_only=True)


class UpdateProfileSerializer(serializers.Serializer):
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
    )
    avatar_url = serializers.URLField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    allow_group_invitations = serializers.BooleanField(required=False)
