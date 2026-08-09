from __future__ import annotations

from abc import ABC, abstractmethod

from apps.private_spaces.domain.models import (
    DirectChatEntity,
    GroupEntity,
    GroupInvitationEntity,
    GroupInvitationPage,
    GroupMemberEntity,
)


class AbstractPrivateSpacesRepository(ABC):
    """Port the use cases depend on; implemented by a Django-backed adapter."""

    # -- Direct chats --------------------------------------------------

    @abstractmethod
    def user_exists(self, user_id: int) -> bool: ...

    @abstractmethod
    def list_direct_chats_for_user(self, user_id: int) -> list[DirectChatEntity]: ...

    @abstractmethod
    def get_or_create_direct_chat(
        self, user1_id: int, user2_id: int
    ) -> tuple[DirectChatEntity, bool]: ...

    @abstractmethod
    def get_direct_chat_for_participant(
        self, dm_id: int, user_id: int
    ) -> DirectChatEntity | None: ...

    @abstractmethod
    def delete_direct_chat(self, dm_id: int) -> None: ...

    # -- Groups ----------------------------------------------------------

    @abstractmethod
    def list_groups_for_user(self, user_id: int) -> list[GroupEntity]: ...

    @abstractmethod
    def create_group_with_owner(self, name: str, creator_id: int) -> GroupEntity: ...

    @abstractmethod
    def get_group_for_member(
        self, group_id: int, user_id: int
    ) -> GroupEntity | None: ...

    @abstractmethod
    def update_group(self, group_id: int, name: str) -> GroupEntity: ...

    @abstractmethod
    def delete_group(self, group_id: int) -> None: ...

    @abstractmethod
    def remove_group_member(self, group_id: int, user_id: int) -> bool: ...

    @abstractmethod
    def is_group_member(self, group_id: int, user_id: int) -> bool: ...

    @abstractmethod
    def list_group_members(self, group_id: int) -> list[GroupMemberEntity]: ...

    # -- Invitations -------------------------------------------------------

    @abstractmethod
    def create_or_get_invitation(
        self, group_id: int, inviter_id: int, invitee_id: int
    ) -> tuple[GroupInvitationEntity, bool]: ...

    @abstractmethod
    def respond_to_invitation_as_invitee(
        self, invitation_id: int, user_id: int, status: str
    ) -> GroupInvitationEntity: ...

    @abstractmethod
    def list_pending_invitations_for_user(
        self, user_id: int, *, limit: int, offset: int
    ) -> GroupInvitationPage: ...
