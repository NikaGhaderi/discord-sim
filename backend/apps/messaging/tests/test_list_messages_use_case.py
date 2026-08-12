from unittest.mock import Mock

import pytest

from apps.messaging.application.use_cases.list_messages import ListMessagesUseCase
from apps.messaging.domain.exceptions import (
    InvalidMessageTargetError,
    MessageTargetNotFoundError,
)
from apps.messaging.domain.models import MessagePage


def test_list_messages_passes_target_and_pagination_to_repository():
    repository = Mock()
    repository.can_access_target.return_value = True
    repository.list_messages.return_value = MessagePage(count=0, results=[])

    page = ListMessagesUseCase(repository).execute(
        1,
        topic_id=5,
        limit=25,
        offset=50,
    )

    assert page == MessagePage(count=0, results=[])
    repository.list_messages.assert_called_once_with(
        topic_id=5,
        group_id=None,
        direct_chat_id=None,
        limit=25,
        offset=50,
    )


def test_list_messages_rejects_multiple_targets():
    with pytest.raises(InvalidMessageTargetError):
        ListMessagesUseCase(Mock()).execute(1, topic_id=5, direct_chat_id=8)


def test_list_messages_rejects_inaccessible_target():
    repository = Mock()
    repository.can_access_target.return_value = False

    with pytest.raises(MessageTargetNotFoundError):
        ListMessagesUseCase(repository).execute(1, direct_chat_id=8)

    repository.list_messages.assert_not_called()
