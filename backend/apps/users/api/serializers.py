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


class UserIdsQuerySerializer(serializers.Serializer):
    """Parses `?ids=1,2,3` for the bulk by-id lookup endpoint."""

    ids = serializers.CharField()

    def validate_ids(self, value: str) -> list[int]:
        raw_ids = [part.strip() for part in value.split(",") if part.strip()]
        if not raw_ids:
            raise serializers.ValidationError("At least one id is required.")
        if len(raw_ids) > 100:
            raise serializers.ValidationError(
                "At most 100 ids may be requested at once."
            )
        try:
            return [int(raw_id) for raw_id in raw_ids]
        except ValueError as exc:
            raise serializers.ValidationError(
                "ids must be a comma-separated list of integers."
            ) from exc


class UpdateProfileSerializer(serializers.Serializer):
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
    )
    avatar_url = serializers.URLField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    allow_group_invitations = serializers.BooleanField(required=False)
