from django.conf import settings
from django.db import models


class Channel(models.Model):
    name = models.CharField(max_length=150)
    invite_token = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_channels",
    )
    default_topic = models.ForeignKey(
        "Topic",
        null=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    def __str__(self):
        return f"{self.name}"


class Topic(models.Model):
    title = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name="topics",
    )
