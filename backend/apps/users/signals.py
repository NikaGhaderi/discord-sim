from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.users.models import Profile


@receiver(
    post_save,
    sender=settings.AUTH_USER_MODEL,
    dispatch_uid="users.create_profile_for_new_user",
)
def create_profile_for_new_user(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(
            user=instance,
            defaults={"display_name": instance.username},
        )
