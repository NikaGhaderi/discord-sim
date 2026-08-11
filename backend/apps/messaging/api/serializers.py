from rest_framework import serializers

from apps.messaging.application.use_cases.messages import validate_exactly_one_target
from apps.messaging.domain.exceptions import InvalidMessageTargetError


class MessageTargetSerializer(serializers.Serializer):
    topic_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    group_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    direct_chat_id = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )

    def validate(self, attrs):
        try:
            validate_exactly_one_target(
                attrs.get("topic_id"),
                attrs.get("group_id"),
                attrs.get("direct_chat_id"),
            )
        except InvalidMessageTargetError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return attrs


class CreateMessageSerializer(MessageTargetSerializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=False)


class CreateScheduledMessageSerializer(CreateMessageSerializer):
    scheduled_time = serializers.DateTimeField()


class MessageQuerySerializer(MessageTargetSerializer):
    limit = serializers.IntegerField(
        required=False, default=50, min_value=1, max_value=100
    )
    offset = serializers.IntegerField(required=False, default=0, min_value=0)


class SearchMessageQuerySerializer(MessageQuerySerializer):
    q = serializers.CharField(allow_blank=False, trim_whitespace=True)


class UpdateMessageSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=False)


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField(allow_empty_file=False)


class MediaSerializer(serializers.Serializer):
    media_id = serializers.IntegerField(read_only=True)
    base_message_id = serializers.IntegerField(read_only=True)
    file_url = serializers.CharField(read_only=True)
    file_type = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.CharField(read_only=True, allow_null=True)


class MediaSummarySerializer(serializers.Serializer):
    file_url = serializers.CharField(read_only=True)
    file_type = serializers.CharField(read_only=True)


class MessageSerializer(serializers.Serializer):
    base_message_id = serializers.IntegerField(read_only=True)
    sender_id = serializers.IntegerField(read_only=True)
    content = serializers.CharField(read_only=True)
    sent_at = serializers.DateTimeField(read_only=True)
    is_edited = serializers.BooleanField(read_only=True)


class MessageHistorySerializer(MessageSerializer):
    media = MediaSummarySerializer(many=True, read_only=True)
