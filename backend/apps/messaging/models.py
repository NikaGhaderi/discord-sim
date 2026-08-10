from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


def exactly_one_target_constraint(name: str) -> models.CheckConstraint:
    return models.CheckConstraint(
        check=(
            Q(topic__isnull=False, group__isnull=True, direct_chat__isnull=True)
            | Q(topic__isnull=True, group__isnull=False, direct_chat__isnull=True)
            | Q(topic__isnull=True, group__isnull=True, direct_chat__isnull=False)
        ),
        name=name,
    )


def validate_message_target(instance) -> None:
    targets = (instance.topic_id, instance.group_id, instance.direct_chat_id)
    if sum(value is not None for value in targets) != 1:
        raise ValidationError(
            "Exactly one of topic, group, or direct chat must be set."
        )


class BaseMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="base_messages",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class Message(BaseMessage):
    topic = models.ForeignKey(
        "workspaces.Topic",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    group = models.ForeignKey(
        "private_spaces.Group",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    direct_chat = models.ForeignKey(
        "private_spaces.DirectChat",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    body = models.TextField()
    is_edited = models.BooleanField(default=False)

    class Meta:
        ordering = ("created_at", "id")
        constraints = [
            exactly_one_target_constraint("messaging_message_exactly_one_target")
        ]

    def clean(self):
        super().clean()
        validate_message_target(self)


class ScheduledMessage(BaseMessage):
    topic = models.ForeignKey(
        "workspaces.Topic",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="scheduled_messages",
    )
    group = models.ForeignKey(
        "private_spaces.Group",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="scheduled_messages",
    )
    direct_chat = models.ForeignKey(
        "private_spaces.DirectChat",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="scheduled_messages",
    )
    scheduled_time = models.DateTimeField()
    body = models.TextField()

    class Meta:
        ordering = ("scheduled_time", "id")
        constraints = [
            exactly_one_target_constraint("messaging_scheduled_exactly_one_target")
        ]

    def clean(self):
        super().clean()
        validate_message_target(self)


class Media(models.Model):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="media",
    )
    file = models.FileField(upload_to="message_media/%Y/%m/%d")
    content_type = models.CharField(max_length=255)
    thumbnail = models.ImageField(
        upload_to="message_media_thumbnails/%Y/%m/%d", null=True, blank=True
    )
    file_size = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)


class MessageHistory(models.Model):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="history",
    )
    previous_body = models.TextField()
    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("edited_at", "id")
