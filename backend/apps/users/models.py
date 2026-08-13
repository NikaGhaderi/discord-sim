from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=150, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    # Real uploaded photo. avatar_url stays the single field every consumer
    # (serializers, frontend) reads -- uploading here just sets avatar_url
    # to this file's URL, same as pasting a URL directly ever did.
    avatar = models.ImageField(upload_to="avatars/%Y/%m/%d", null=True, blank=True)
    bio = models.TextField(blank=True, default="")
    allow_group_invitations = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s profile"
