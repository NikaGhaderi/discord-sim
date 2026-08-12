from datetime import datetime, timedelta
from unittest import mock

from django.utils import timezone
import pytest
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.messaging.application.interfaces import AbstractMessagingRepository
from apps.messaging.application.use_cases.cancel_scheduled_message import (
    CancelScheduledMessageUseCase,
)
from apps.messaging.application.use_cases.create_scheduled_message import (
    CreateScheduledMessageUseCase,
)
from apps.messaging.domain.exceptions import (
    InvalidScheduledTimeError,
    ScheduledMessageCancelForbiddenError,
)
from apps.messaging.domain.models import ScheduledMessageEntity
from apps.messaging.models import Message, ScheduledMessage
from apps.messaging.tasks import promote_scheduled_message
from apps.private_spaces.models import Group, GroupMember


@pytest.fixture
def scheduled_space(db):
    sender = User.objects.create_user(
        username="scheduled-sender", email="scheduled-sender@example.com"
    )
    member = User.objects.create_user(
        username="scheduled-member", email="scheduled-member@example.com"
    )
    outsider = User.objects.create_user(
        username="scheduled-outsider", email="scheduled-outsider@example.com"
    )
    group = Group.objects.create(name="Scheduled group", creator=sender)
    GroupMember.objects.create(group=group, user=sender, is_admin=True)
    GroupMember.objects.create(group=group, user=member)
    return sender, member, outsider, group


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_create_use_case_persists_then_schedules_task():
    repository = mock.Mock(spec=AbstractMessagingRepository)
    dispatcher = mock.Mock()
    scheduled_time = timezone.now() + timedelta(minutes=10)
    entity = ScheduledMessageEntity(
        scheduled_id=12,
        sender_id=1,
        body="Standup reminder",
        scheduled_time=scheduled_time,
        topic_id=5,
    )
    repository.can_access_target.return_value = True
    repository.create_scheduled_message.return_value = entity

    result = CreateScheduledMessageUseCase(repository, dispatcher).execute(
        1,
        "Standup reminder",
        scheduled_time,
        topic_id=5,
    )

    assert result == entity
    dispatcher.schedule.assert_called_once_with(12, scheduled_time)


def test_cancel_use_case_rejects_non_sender():
    repository = mock.Mock(spec=AbstractMessagingRepository)
    repository.get_scheduled_message.return_value = ScheduledMessageEntity(
        scheduled_id=12,
        sender_id=1,
        body="Standup reminder",
        scheduled_time=timezone.now() + timedelta(minutes=10),
        topic_id=5,
    )

    with pytest.raises(ScheduledMessageCancelForbiddenError):
        CancelScheduledMessageUseCase(repository).execute(12, user_id=2)

    repository.delete_scheduled_message.assert_not_called()


def test_create_use_case_rejects_naive_or_past_scheduled_time():
    repository = mock.Mock(spec=AbstractMessagingRepository)
    use_case = CreateScheduledMessageUseCase(repository, mock.Mock())

    with pytest.raises(InvalidScheduledTimeError):
        use_case.execute(1, "Past", timezone.now() - timedelta(seconds=1), topic_id=5)
    with pytest.raises(InvalidScheduledTimeError):
        use_case.execute(1, "Naive", datetime.now(), topic_id=5)

    repository.create_scheduled_message.assert_not_called()


@pytest.mark.django_db
def test_create_endpoint_matches_contract_and_does_not_publish_early(
    scheduled_space,
):
    sender, _member, _outsider, group = scheduled_space
    scheduled_time = timezone.now() + timedelta(minutes=10)

    with mock.patch("apps.messaging.tasks.promote_scheduled_message") as task:
        response = _client(sender).post(
            "/api/messages/scheduled/",
            {
                "group_id": group.id,
                "content": "Standup reminder",
                "scheduled_time": scheduled_time.isoformat(),
            },
            format="json",
        )

    assert response.status_code == 201
    scheduled = ScheduledMessage.objects.get()
    assert response.json() == {
        "scheduled_id": scheduled.id,
        "status": "QUEUED",
    }
    assert Message.objects.count() == 0
    task.apply_async.assert_called_once_with(
        args=(scheduled.id,), eta=scheduled.scheduled_time
    )


@pytest.mark.django_db
def test_non_sender_cannot_cancel_scheduled_message(scheduled_space):
    sender, member, _outsider, group = scheduled_space
    scheduled = ScheduledMessage.objects.create(
        sender=sender,
        group=group,
        body="Standup reminder",
        scheduled_time=timezone.now() + timedelta(minutes=10),
    )

    response = _client(member).delete(f"/api/messages/scheduled/{scheduled.id}/")

    assert response.status_code == 403
    assert ScheduledMessage.objects.filter(pk=scheduled.id).exists()


@pytest.mark.django_db
def test_task_promotes_message_and_history_endpoint_can_query_it(scheduled_space):
    sender, _member, _outsider, group = scheduled_space
    scheduled = ScheduledMessage.objects.create(
        sender=sender,
        group=group,
        body="Standup reminder",
        scheduled_time=timezone.now(),
    )
    client = _client(sender)

    before = client.get(f"/api/messages/?group_id={group.id}")
    promoted_id = promote_scheduled_message(scheduled.id)
    after = client.get(f"/api/messages/?group_id={group.id}")

    assert before.json()["results"] == []
    assert not ScheduledMessage.objects.filter(pk=scheduled.id).exists()
    assert Message.objects.filter(pk=promoted_id).exists()
    assert after.json()["results"][0]["content"] == "Standup reminder"


@pytest.mark.django_db
def test_cancelled_scheduled_message_task_is_safe_no_op(scheduled_space):
    sender, _member, _outsider, group = scheduled_space
    scheduled = ScheduledMessage.objects.create(
        sender=sender,
        group=group,
        body="Never publish",
        scheduled_time=timezone.now() + timedelta(minutes=10),
    )

    response = _client(sender).delete(f"/api/messages/scheduled/{scheduled.id}/")
    result = promote_scheduled_message(scheduled.id)

    assert response.status_code == 204
    assert result is None
    assert Message.objects.count() == 0
