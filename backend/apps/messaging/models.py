from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class BaseMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="base_messages",
    )
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
    content = models.TextField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(topic__isnull=False, group__isnull=True, direct_chat__isnull=True)
                    | Q(
                        topic__isnull=True,
                        group__isnull=False,
                        direct_chat__isnull=True,
                    )
                    | Q(
                        topic__isnull=True,
                        group__isnull=True,
                        direct_chat__isnull=False,
                    )
                ),
                name="messaging_exactly_one_target",
            )
        ]
        indexes = [
            models.Index(fields=("topic", "id"), name="messaging_topic_message_idx"),
            models.Index(fields=("group", "id"), name="messaging_group_message_idx"),
            models.Index(
                fields=("direct_chat", "id"),
                name="messaging_dm_message_idx",
            ),
        ]

    def clean(self):
        super().clean()
        targets = (self.topic_id, self.group_id, self.direct_chat_id)
        if sum(value is not None for value in targets) != 1:
            raise ValidationError(
                "Exactly one of topic, group, or direct chat must be set."
            )


class Message(BaseMessage):
    is_edited = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sent_at", "id")


class ScheduledMessage(BaseMessage):
    scheduled_time = models.DateTimeField()

    class Meta:
        ordering = ("scheduled_time", "id")


class Media(models.Model):
    base_message = models.ForeignKey(
        BaseMessage,
        on_delete=models.CASCADE,
        related_name="media",
    )
    file = models.FileField(upload_to="message_media/%Y/%m/%d")
    file_type = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)


class MessageHistory(models.Model):
    base_message = models.ForeignKey(
        BaseMessage,
        on_delete=models.CASCADE,
        related_name="history",
    )
    old_content = models.TextField()
    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("edited_at", "id")
