import pytest

from apps.private_spaces.application.use_cases.invitations import (
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
