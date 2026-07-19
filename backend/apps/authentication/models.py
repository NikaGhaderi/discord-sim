from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Application user persisted in PostgreSQL."""

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
