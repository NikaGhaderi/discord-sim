"""Generic email-sending Celery task.

Cross-app infrastructure per .cursorrules -- lives in core/tasks, not inside
any single app, since more than one app needs to send email (2FA codes now,
password reset later). Deliberately thin: sending an email has no business
logic to delegate to an application service, just an infrastructure call.
"""

from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task(name="core.send_email_task")
def send_email_task(to_email: str, subject: str, body: str) -> None:
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [to_email],
        fail_silently=False,
    )
