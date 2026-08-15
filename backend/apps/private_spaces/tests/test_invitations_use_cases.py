from unittest.mock import Mock

import pytest

from apps.private_spaces.application.use_cases.invitations import (
    ListMyInvitationsUseCase,
    RespondToInvitationUseCase,
    SendGroupInvitationUseCase,
)
from apps.private_spaces.domain.exceptions import (
    AlreadyGroupMemberError,
    GroupNotFoundError,
    InvitationNotFoundError,
    InvitationsDisabledError,
    InviteeNotFoundError,
)
from apps.private_spaces.tests.fakes import InMemoryPrivateSpacesRepository
from apps.users.domain.models import UserProfileEntity
from apps.users.tests.fakes import InMemoryProfileRepository


def _profile(user_id: int, *, allow_group_invitations: bool) -> UserProfileEntity:
    return UserProfileEntity(
        user_id=user_id,
        username=f"user-{user_id}",
        display_name="",
        avatar_url="",
        bio="",
        allow_group_invitations=allow_group_invitations,
    )


class TestSendGroupInvitationUseCase:
    def test_sends_invitation_when_invitee_allows_it(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        profiles = InMemoryProfileRepository(
            [_profile(20, allow_group_invitations=True)]
        )

        invitation, created = SendGroupInvitationUseCase(repo, profiles).execute(
            group_id=1, inviter_id=10, invitee_id=20
        )

        assert created is True
        assert invitation.status == "PENDING"
        assert invitation.invitee_id == 20

    def test_notifies_the_invitee_when_a_new_invitation_is_created(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        profiles = InMemoryProfileRepository(
            [_profile(20, allow_group_invitations=True)]
        )
        recorder = Mock()

        SendGroupInvitationUseCase(repo, profiles, recorder).execute(
            group_id=1, inviter_id=10, invitee_id=20
        )

        recorder.record.assert_called_once_with(
            [20], "GROUP_INVITATION_RECEIVED", {"group_id": 1, "inviter_id": 10}
        )

    def test_does_not_re_notify_for_an_already_pending_invitation(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        profiles = InMemoryProfileRepository(
            [_profile(20, allow_group_invitations=True)]
        )
        recorder = Mock()
        SendGroupInvitationUseCase(repo, profiles, recorder).execute(
            group_id=1, inviter_id=10, invitee_id=20
        )
        recorder.reset_mock()

        _invitation, created = SendGroupInvitationUseCase(repo, profiles, recorder).execute(
            group_id=1, inviter_id=10, invitee_id=20
        )

        assert created is False
        recorder.record.assert_not_called()

    def test_rejects_when_invitee_disabled_invitations(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        profiles = InMemoryProfileRepository(
            [_profile(20, allow_group_invitations=False)]
        )

        with pytest.raises(InvitationsDisabledError):
            SendGroupInvitationUseCase(repo, profiles).execute(1, 10, 20)

    def test_rejects_when_inviter_is_not_a_member(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        profiles = InMemoryProfileRepository(
            [_profile(20, allow_group_invitations=True)]
        )

        with pytest.raises(GroupNotFoundError):
            SendGroupInvitationUseCase(repo, profiles).execute(
                group_id=1, inviter_id=999, invitee_id=20
            )

    def test_rejects_a_nonexistent_invitee(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        profiles = InMemoryProfileRepository([])

        with pytest.raises(InviteeNotFoundError):
            SendGroupInvitationUseCase(repo, profiles).execute(1, 10, 999)

    def test_rejects_when_invitee_already_a_member(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_membership(1, 20)
        repo.seed_user(20)
        profiles = InMemoryProfileRepository(
            [_profile(20, allow_group_invitations=True)]
        )

        with pytest.raises(AlreadyGroupMemberError):
            SendGroupInvitationUseCase(repo, profiles).execute(1, 10, 20)


class TestRespondToInvitationUseCase:
    def test_accepting_adds_the_invitee_as_a_member(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        invitation, _ = repo.create_or_get_invitation(1, 10, 20)

        result = RespondToInvitationUseCase(repo).execute(
            invitation_id=invitation.id, user_id=20, status="ACCEPTED"
        )

        assert result.status == "ACCEPTED"
        assert repo.is_group_member(1, 20) is True

    def test_declining_does_not_add_a_member(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        invitation, _ = repo.create_or_get_invitation(1, 10, 20)

        result = RespondToInvitationUseCase(repo).execute(
            invitation_id=invitation.id, user_id=20, status="DECLINED"
        )

        assert result.status == "DECLINED"
        assert repo.is_group_member(1, 20) is False

    def test_accepting_notifies_the_inviter(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        invitation, _ = repo.create_or_get_invitation(1, 10, 20)
        recorder = Mock()

        RespondToInvitationUseCase(repo, recorder).execute(
            invitation_id=invitation.id, user_id=20, status="ACCEPTED"
        )

        recorder.record.assert_called_once_with(
            [10], "INVITATION_ACCEPTED", {"group_id": 1, "invitee_id": 20}
        )

    def test_declining_does_not_notify(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        invitation, _ = repo.create_or_get_invitation(1, 10, 20)
        recorder = Mock()

        RespondToInvitationUseCase(repo, recorder).execute(
            invitation_id=invitation.id, user_id=20, status="DECLINED"
        )

        recorder.record.assert_not_called()

    def test_only_the_invitee_can_respond(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        invitation, _ = repo.create_or_get_invitation(1, 10, 20)

        with pytest.raises(InvitationNotFoundError):
            RespondToInvitationUseCase(repo).execute(
                invitation_id=invitation.id, user_id=999, status="ACCEPTED"
            )


class TestListMyInvitationsUseCase:
    def test_lists_only_the_requesters_pending_invitations(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        repo.seed_user(30)
        mine, _ = repo.create_or_get_invitation(1, 10, 20)
        repo.create_or_get_invitation(1, 10, 30)  # someone else's invitation

        page = ListMyInvitationsUseCase(repo).execute(user_id=20)

        assert page.count == 1
        assert [inv.id for inv in page.results] == [mine.id]

    def test_excludes_already_responded_invitations(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        invitation, _ = repo.create_or_get_invitation(1, 10, 20)
        RespondToInvitationUseCase(repo).execute(
            invitation_id=invitation.id, user_id=20, status="ACCEPTED"
        )

        page = ListMyInvitationsUseCase(repo).execute(user_id=20)

        assert page.count == 0
        assert page.results == []

    def test_respects_limit_and_offset(self):
        repo = InMemoryPrivateSpacesRepository()
        repo.seed_group(1, "Group", creator_id=10)
        repo.seed_membership(1, 10)
        repo.seed_user(20)
        for group_id in range(1, 4):
            repo.seed_group(group_id, f"Group {group_id}", creator_id=10)
            repo.seed_membership(group_id, 10)
            repo.create_or_get_invitation(group_id, 10, 20)

        page = ListMyInvitationsUseCase(repo).execute(user_id=20, limit=1, offset=1)

        assert page.count == 3
        assert len(page.results) == 1
