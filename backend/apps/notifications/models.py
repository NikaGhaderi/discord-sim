from django.db import models
from django.conf import settings

class Notification(models.Model):
    recipient   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    event_type  = models.CharField(max_length=64)
    payload     = models.JSONField()
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
