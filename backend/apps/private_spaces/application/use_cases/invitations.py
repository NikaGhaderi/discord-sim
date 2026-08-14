from apps.private_spaces.application.interfaces import (
    AbstractNotificationRecorder,
    AbstractPrivateSpacesRepository,
)
from apps.private_spaces.domain.exceptions import (
    AlreadyGroupMemberError,
    GroupNotFoundError,
    InvitationsDisabledError,
    InviteeNotFoundError,
)
from apps.private_spaces.domain.models import GroupInvitationEntity, GroupInvitationPage
from apps.users.application.interfaces import AbstractProfileRepository


class SendGroupInvitationUseCase:
    def __init__(
        self,
        repository: AbstractPrivateSpacesRepository,
        profile_repository: AbstractProfileRepository,
    ) -> None:
        self._repository = repository
        self._profile_repository = profile_repository

    def execute(
        self, group_id: int, inviter_id: int, invitee_id: int
    ) -> tuple[GroupInvitationEntity, bool]:
        if not self._repository.is_group_member(group_id, inviter_id):
            raise GroupNotFoundError("Group not found.")
        if not self._repository.user_exists(invitee_id):
            raise InviteeNotFoundError("Invitee not found.")

        profile = self._profile_repository.get_by_user_id(invitee_id)
        if profile is None or not profile.allow_group_invitations:
            raise InvitationsDisabledError(
                "This user does not allow group invitations."
            )
        if self._repository.is_group_member(group_id, invitee_id):
            raise AlreadyGroupMemberError("This user is already a group member.")

        return self._repository.create_or_get_invitation(
            group_id, inviter_id, invitee_id
        )


class RespondToInvitationUseCase:
    def __init__(
        self,
        repository: AbstractPrivateSpacesRepository,
        notification_recorder: AbstractNotificationRecorder | None = None,
    ) -> None:
        self._repository = repository
        self._notification_recorder = notification_recorder

    def execute(
        self, invitation_id: int, user_id: int, status: str
    ) -> GroupInvitationEntity:
        invitation = self._repository.respond_to_invitation_as_invitee(
            invitation_id, user_id, status
        )
        if status == "ACCEPTED" and self._notification_recorder is not None:
            self._notification_recorder.record(
                [invitation.inviter_id],
                "INVITATION_ACCEPTED",
                {"group_id": invitation.group_id, "invitee_id": invitation.invitee_id},
            )
        return invitation


class ListMyInvitationsUseCase:
    """Read-only -- the allow_group_invitations privacy flag only gates
    *sending* an invitation (SendGroupInvitationUseCase), not viewing ones
    already sent to you."""

    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(
        self, user_id: int, *, limit: int = 50, offset: int = 0
    ) -> GroupInvitationPage:
        return self._repository.list_pending_invitations_for_user(
            user_id, limit=limit, offset=offset
        )
