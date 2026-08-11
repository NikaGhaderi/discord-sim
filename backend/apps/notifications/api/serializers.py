from rest_framework import serializers


class NotificationSerializer(serializers.Serializer):
    notification_id = serializers.IntegerField(read_only=True)
    event_type = serializers.CharField(read_only=True)
    payload = serializers.JSONField(read_only=True)
    is_read = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class UpdateNotificationSerializer(serializers.Serializer):
    is_read = serializers.BooleanField()
