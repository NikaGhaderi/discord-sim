from apps.private_spaces.application.interfaces import AbstractPrivateSpacesRepository
from apps.private_spaces.domain.exceptions import InvitationNotFoundError
from apps.private_spaces.domain.models import (
    DirectChatEntity,
    GroupEntity,
    GroupInvitationEntity,
)


class InMemoryPrivateSpacesRepository(AbstractPrivateSpacesRepository):
    def __init__(self):
        self._existing_user_ids: set[int] = set()
        self._direct_chats: dict[int, DirectChatEntity] = {}
        self._groups: dict[int, GroupEntity] = {}
        self._memberships: dict[int, set[int]] = {}  # group_id -> {user_id, ...}
        self._invitations: dict[int, GroupInvitationEntity] = {}
        self._next_dm_id = 1
        self._next_group_id = 1
        self._next_invitation_id = 1

    # -- test setup helpers, not part of the interface --------------------

    def seed_user(self, user_id: int) -> None:
        self._existing_user_ids.add(user_id)

    def seed_group(self, group_id: int, name: str, creator_id: int) -> None:
        self._groups[group_id] = GroupEntity(
            id=group_id, name=name, creator_id=creator_id
        )
        self._memberships.setdefault(group_id, set())

    def seed_membership(self, group_id: int, user_id: int) -> None:
        self._memberships.setdefault(group_id, set()).add(user_id)

    # -- direct chats -------------------------------------------------------

    def user_exists(self, user_id: int) -> bool:
        return user_id in self._existing_user_ids

    def list_direct_chats_for_user(self, user_id: int) -> list[DirectChatEntity]:
        return [
            c
            for c in self._direct_chats.values()
            if c.user1_id == user_id or c.user2_id == user_id
        ]

    def get_or_create_direct_chat(
        self, user1_id: int, user2_id: int
    ) -> tuple[DirectChatEntity, bool]:
        for chat in self._direct_chats.values():
            if chat.user1_id == user1_id and chat.user2_id == user2_id:
                return chat, False
        chat = DirectChatEntity(
            id=self._next_dm_id, user1_id=user1_id, user2_id=user2_id
        )
        self._direct_chats[chat.id] = chat
        self._next_dm_id += 1
        return chat, True

    def get_direct_chat_for_participant(self, dm_id, user_id):
        chat = self._direct_chats.get(dm_id)
        if chat is None:
            return None
        if chat.user1_id != user_id and chat.user2_id != user_id:
            return None
        return chat

    def delete_direct_chat(self, dm_id: int) -> None:
        self._direct_chats.pop(dm_id, None)

    # -- groups -------------------------------------------------------------

    def list_groups_for_user(self, user_id: int) -> list[GroupEntity]:
        return [
            self._groups[gid]
            for gid, members in self._memberships.items()
            if user_id in members
        ]

    def create_group_with_owner(self, name: str, creator_id: int) -> GroupEntity:
        group = GroupEntity(id=self._next_group_id, name=name, creator_id=creator_id)
        self._groups[group.id] = group
        self._memberships[group.id] = {creator_id}
        self._next_group_id += 1
        return group

    def get_group_for_member(self, group_id, user_id):
        if user_id not in self._memberships.get(group_id, set()):
            return None
        return self._groups.get(group_id)

    def update_group(self, group_id: int, name: str) -> GroupEntity:
        group = self._groups[group_id]
        group.name = name
        return group

    def delete_group(self, group_id: int) -> None:
        self._groups.pop(group_id, None)
        self._memberships.pop(group_id, None)

    def remove_group_member(self, group_id: int, user_id: int) -> bool:
        members = self._memberships.get(group_id, set())
        if user_id not in members:
            return False
        members.remove(user_id)
        return True

    def is_group_member(self, group_id: int, user_id: int) -> bool:
        return user_id in self._memberships.get(group_id, set())

    # -- invitations ----------------------------------------------------------

    def create_or_get_invitation(self, group_id, inviter_id, invitee_id):
        for inv in self._invitations.values():
            if (
                inv.group_id == group_id
                and inv.invitee_id == invitee_id
                and inv.status == "PENDING"
            ):
                return inv, False
        invitation = GroupInvitationEntity(
            id=self._next_invitation_id,
            group_id=group_id,
            inviter_id=inviter_id,
            invitee_id=invitee_id,
            status="PENDING",
        )
        self._invitations[invitation.id] = invitation
        self._next_invitation_id += 1
        return invitation, True

    def respond_to_invitation_as_invitee(self, invitation_id, user_id, status):
        invitation = self._invitations.get(invitation_id)
        if (
            invitation is None
            or invitation.invitee_id != user_id
            or invitation.status != "PENDING"
        ):
            raise InvitationNotFoundError("Pending invitation not found.")
        invitation.status = status
        if status == "ACCEPTED":
            self._memberships.setdefault(invitation.group_id, set()).add(user_id)
        return invitation
