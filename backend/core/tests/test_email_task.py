from django.core import mail

from core.tasks.email import send_email_task


def test_send_email_task_sends_a_real_email_via_django_mail():
    send_email_task.run("nika@example.com", "Your code", "Your 2FA code is 123456.")

    assert len(mail.outbox) == 1
    sent = mail.outbox[0]
    assert sent.to == ["nika@example.com"]
    assert sent.subject == "Your code"
    assert "123456" in sent.body


def test_send_email_task_uses_the_configured_from_address(settings):
    settings.DEFAULT_FROM_EMAIL = "noreply@discord-sim.local"

    send_email_task.run("nika@example.com", "Subject", "Body")

    assert mail.outbox[0].from_email == "noreply@discord-sim.local"
