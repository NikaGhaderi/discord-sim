from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Application user persisted in PostgreSQL. Mirrors the ERD's USER table
    plus is_2fa_enabled, which this module owns (see domain.models.UserEntity).

    `username` is left untouched -- AbstractUser already declares it
    unique=True with UnicodeUsernameValidator; redeclaring it here (as the
    original SCRUM-15 commit did) silently drops that validator.
    """

    email = models.EmailField(unique=True)
    is_2fa_enabled = models.BooleanField(default=True)
    allow_group_invitations = models.BooleanField(default=True)
