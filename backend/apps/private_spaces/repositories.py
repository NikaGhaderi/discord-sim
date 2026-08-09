from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q

from apps.private_spaces.application.interfaces import AbstractPrivateSpacesRepository
from apps.private_spaces.domain.exceptions import InvitationNotFoundError
from apps.private_spaces.domain.models import (
    DirectChatEntity,
    GroupEntity,
    GroupInvitationEntity,
    GroupInvitationPage,
    GroupMemberEntity,
)
from apps.private_spaces.models import DirectChat, Group, GroupInvitation, GroupMember


def _to_direct_chat_entity(chat: DirectChat) -> DirectChatEntity:
    return DirectChatEntity(
        id=chat.id,
        user1_id=chat.user1_id,
        user2_id=chat.user2_id,
        created_at=chat.created_at,
    )


def _to_group_entity(group: Group) -> GroupEntity:
    return GroupEntity(
        id=group.id,
        name=group.name,
        creator_id=group.creator_id,
        created_at=group.created_at,
    )


def _to_invitation_entity(invitation: GroupInvitation) -> GroupInvitationEntity:
    return GroupInvitationEntity(
        id=invitation.id,
        group_id=invitation.group_id,
        inviter_id=invitation.inviter_id,
        invitee_id=invitation.invitee_id,
        status=invitation.status,
        created_at=invitation.created_at,
    )


class DjangoPrivateSpacesRepository(AbstractPrivateSpacesRepository):
    # -- direct chats -----------------------------------------------------

    def user_exists(self, user_id: int) -> bool:
        return get_user_model().objects.filter(pk=user_id).exists()

    def list_direct_chats_for_user(self, user_id: int) -> list[DirectChatEntity]:
        chats = DirectChat.objects.filter(Q(user1_id=user_id) | Q(user2_id=user_id))
        return [_to_direct_chat_entity(c) for c in chats]

    def get_or_create_direct_chat(
        self, user1_id: int, user2_id: int
    ) -> tuple[DirectChatEntity, bool]:
        try:
            with transaction.atomic():
                chat, created = DirectChat.objects.get_or_create(
                    user1_id=user1_id, user2_id=user2_id
                )
        except IntegrityError:
            chat = DirectChat.objects.get(user1_id=user1_id, user2_id=user2_id)
            created = False
        return _to_direct_chat_entity(chat), created

    def get_direct_chat_for_participant(self, dm_id: int, user_id: int):
        chat = (
            DirectChat.objects.filter(pk=dm_id)
            .filter(Q(user1_id=user_id) | Q(user2_id=user_id))
            .first()
        )
        return _to_direct_chat_entity(chat) if chat else None

    def delete_direct_chat(self, dm_id: int) -> None:
        DirectChat.objects.filter(pk=dm_id).delete()

    # -- groups -------------------------------------------------------------

    def list_groups_for_user(self, user_id: int) -> list[GroupEntity]:
        groups = Group.objects.filter(memberships__user_id=user_id).distinct()
        return [_to_group_entity(g) for g in groups]

    def create_group_with_owner(self, name: str, creator_id: int) -> GroupEntity:
        with transaction.atomic():
            group = Group.objects.create(name=name, creator_id=creator_id)
            GroupMember.objects.create(group=group, user_id=creator_id, is_admin=True)
        return _to_group_entity(group)

    def get_group_for_member(self, group_id: int, user_id: int):
        group = Group.objects.filter(pk=group_id, memberships__user_id=user_id).first()
        return _to_group_entity(group) if group else None

    def update_group(self, group_id: int, name: str) -> GroupEntity:
        group = Group.objects.get(pk=group_id)
        group.name = name
        group.save(update_fields=("name",))
        return _to_group_entity(group)

    def delete_group(self, group_id: int) -> None:
        Group.objects.filter(pk=group_id).delete()

    def remove_group_member(self, group_id: int, user_id: int) -> bool:
        deleted_count, _ = GroupMember.objects.filter(
            group_id=group_id, user_id=user_id
        ).delete()
        return deleted_count > 0

    def is_group_member(self, group_id: int, user_id: int) -> bool:
        return GroupMember.objects.filter(group_id=group_id, user_id=user_id).exists()

    def list_group_members(self, group_id: int) -> list[GroupMemberEntity]:
        memberships = GroupMember.objects.filter(group_id=group_id).order_by(
            "joined_at", "id"
        )
        return [
            GroupMemberEntity(
                user_id=m.user_id, is_admin=m.is_admin, joined_at=m.joined_at
            )
            for m in memberships
        ]

    # -- invitations -------------------------------------------------------

    def create_or_get_invitation(self, group_id: int, inviter_id: int, invitee_id: int):
        try:
            with transaction.atomic():
                invitation, created = GroupInvitation.objects.get_or_create(
                    group_id=group_id,
                    invitee_id=invitee_id,
                    status=GroupInvitation.Status.PENDING,
                    defaults={"inviter_id": inviter_id},
                )
        except IntegrityError:
            invitation = GroupInvitation.objects.get(
                group_id=group_id,
                invitee_id=invitee_id,
                status=GroupInvitation.Status.PENDING,
            )
            created = False
        return _to_invitation_entity(invitation), created

    def list_pending_invitations_for_user(
        self, user_id: int, *, limit: int, offset: int
    ) -> GroupInvitationPage:
        queryset = GroupInvitation.objects.filter(
            invitee_id=user_id, status=GroupInvitation.Status.PENDING
        ).order_by("-created_at", "-id")
        count = queryset.count()
        results = queryset[offset : offset + limit]
        return GroupInvitationPage(
            count=count, results=[_to_invitation_entity(i) for i in results]
        )

    def respond_to_invitation_as_invitee(
        self, invitation_id: int, user_id: int, status: str
    ) -> GroupInvitationEntity:
        with transaction.atomic():
            invitation = (
                GroupInvitation.objects.select_for_update()
                .filter(
                    pk=invitation_id,
                    invitee_id=user_id,
                    status=GroupInvitation.Status.PENDING,
                )
                .first()
            )
            if invitation is None:
                raise InvitationNotFoundError("Pending invitation not found.")

            invitation.status = status
            invitation.save(update_fields=("status",))
            if invitation.status == GroupInvitation.Status.ACCEPTED:
                GroupMember.objects.get_or_create(
                    group=invitation.group,
                    user_id=user_id,
                    defaults={"is_admin": False},
                )

        return _to_invitation_entity(invitation)
