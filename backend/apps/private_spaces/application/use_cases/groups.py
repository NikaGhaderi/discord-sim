from apps.private_spaces.application.interfaces import (
    AbstractNotificationRecorder,
    AbstractPrivateSpacesRepository,
)
from apps.private_spaces.domain.exceptions import (
    GroupMembershipNotFoundError,
    GroupNotFoundError,
)
from apps.private_spaces.domain.models import GroupEntity, GroupMemberEntity


class JoinGroupByInviteTokenUseCase:
    """Lets a user join a group directly via its invite link, the same way
    channels work -- bypasses the invite-by-username flow entirely (and
    with it, the invitee's `allow_group_invitations` opt-out), matching how
    a channel invite link already lets anyone in regardless of that
    equivalent-purpose flag not existing for channels.
    """

    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, invite_token: str, user_id: int) -> GroupEntity:
        group = self._repository.get_group_by_invite_token(invite_token)
        if group is None:
            raise GroupNotFoundError("Group not found.")
        self._repository.add_group_member(group.id, user_id)
        return group


class ListGroupsUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int) -> list[GroupEntity]:
        return self._repository.list_groups_for_user(user_id)


class GetGroupUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int) -> GroupEntity:
        group = self._repository.get_group_for_member(group_id, user_id)
        if group is None:
            raise GroupNotFoundError("Group not found.")
        return group


class CreateGroupUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, user_id: int, name: str) -> GroupEntity:
        return self._repository.create_group_with_owner(name, creator_id=user_id)


class UpdateGroupUseCase:
    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int, name: str) -> GroupEntity:
        group = self._repository.get_group_for_member(group_id, user_id)
        if group is None:
            raise GroupNotFoundError("Group not found.")
        return self._repository.update_group(group_id, name)


class DeleteGroupUseCase:
    """Hard-deletes a whole group.

    Per the Phase 1 doc (§8-3-6), any member -- not just an admin -- may do
    this; SCRUM-26's "admin-only" acceptance criteria was superseded by that
    (see the comment on SCRUM-26).
    """

    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int) -> None:
        group = self._repository.get_group_for_member(group_id, user_id)
        if group is None:
            raise GroupNotFoundError("Group not found.")
        self._repository.delete_group(group_id)


class ListGroupMembersUseCase:
    """Not in the Phase 1 doc's §8-3 contract -- added because the private
    spaces UI (SCRUM-34/35) needs to show who's in a group and who's admin,
    and there was previously no way to get that at all. Gated the same way
    as GetGroupUseCase: a non-member gets GroupNotFoundError (404), not a
    403, matching this codebase's "hide existence" convention rather than
    leaking that the group exists.
    """

    def __init__(self, repository: AbstractPrivateSpacesRepository) -> None:
        self._repository = repository

    def execute(self, group_id: int, user_id: int) -> list[GroupMemberEntity]:
        if not self._repository.is_group_member(group_id, user_id):
            raise GroupNotFoundError("Group not found.")
        return self._repository.list_group_members(group_id)


class LeaveGroupUseCase:
    def __init__(
        self,
        repository: AbstractPrivateSpacesRepository,
        notification_recorder: AbstractNotificationRecorder | None = None,
    ) -> None:
        self._repository = repository
        self._notification_recorder = notification_recorder

    def execute(self, group_id: int, user_id: int) -> None:
        removed = self._repository.remove_group_member(group_id, user_id)
        if not removed:
            raise GroupMembershipNotFoundError("Group membership not found.")
        if self._notification_recorder is not None:
            remaining_ids = [
                m.user_id for m in self._repository.list_group_members(group_id)
            ]
            if remaining_ids:
                self._notification_recorder.record(
                    remaining_ids,
                    "MEMBER_LEFT",
                    {"group_id": group_id, "user_id": user_id},
                )
