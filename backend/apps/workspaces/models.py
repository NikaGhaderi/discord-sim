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


class ChannelMember(models.Model):
    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="channel_memberships",
    )
    nickname_in_channel = models.CharField(max_length=150, blank=True, default="")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "user"], name="workspaces_unique_channel_member"
            ),
        ]


class ChannelRole(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="roles")
    name = models.CharField(max_length=100)
    permissions = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "name"], name="workspaces_unique_channel_role_name"
            ),
        ]


class UserChannelRole(models.Model):
    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name="user_roles"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="channel_roles",
    )
    role = models.ForeignKey(
        ChannelRole, on_delete=models.CASCADE, related_name="assignments"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "user", "role"],
                name="workspaces_unique_user_channel_role",
            ),
        ]
