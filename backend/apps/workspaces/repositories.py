from __future__ import annotations

import secrets

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.workspaces.models import (
    Channel,
    ChannelMember,
    ChannelRole,
    Topic,
    UserChannelRole,
)

from apps.workspaces.application.interfaces import AbstractChannelRepository
from apps.workspaces.domain.exceptions import (
    AlreadyChannelMemberError,
    ChannelMemberNotFoundError,
    ChannelNotFoundError,
    ChannelRoleNotFoundError,
    DuplicateRoleNameError,
    OwnerRoleImmutableError,
    TopicNotFoundError,
)
from apps.workspaces.domain.models import (
    ChannelEntity,
    ChannelMemberEntity,
    ChannelRoleEntity,
    TopicEntity,
    UserChannelRoleEntity,
)
from apps.workspaces.domain.roles import OWNER_ROLE_NAME
from apps.permissions.domain.permissions import PermissionCode


def _to_channel_entity(django_channel) -> ChannelEntity:
    return ChannelEntity(
        id=django_channel.id,
        name=django_channel.name,
        creator_id=django_channel.creator_id,
        invite_token=django_channel.invite_token,
        default_topic_id=django_channel.default_topic_id,
        created_at=django_channel.created_at,
    )


def _to_topic_entity(django_topic) -> TopicEntity:
    return TopicEntity(
        id=django_topic.id,
        title=django_topic.title,
        channel_id=django_topic.channel_id,
        created_at=django_topic.created_at,
    )


def _to_member_entity(django_member) -> ChannelMemberEntity:
    return ChannelMemberEntity(
        id=django_member.id,
        channel_id=django_member.channel_id,
        user_id=django_member.user_id,
        nickname_in_channel=django_member.nickname_in_channel,
        joined_at=django_member.joined_at,
    )


def _to_role_entity(django_role) -> ChannelRoleEntity:
    # The Owner role always grants the full, CURRENT permission catalog --
    # live, not whatever was stored at channel-creation time -- so adding a
    # new PermissionCode later doesn't require backfilling every channel.
    if django_role.name == OWNER_ROLE_NAME:
        permissions = [code.value for code in PermissionCode]
    else:
        permissions = list(django_role.permissions)
    return ChannelRoleEntity(
        id=django_role.id,
        channel_id=django_role.channel_id,
        name=django_role.name,
        permissions=permissions,
    )


def _to_user_role_entity(django_user_role) -> UserChannelRoleEntity:
    return UserChannelRoleEntity(
        id=django_user_role.id,
        channel_id=django_user_role.channel_id,
        user_id=django_user_role.user_id,
        role_id=django_user_role.role_id,
        assigned_at=django_user_role.assigned_at,
    )


class DjangoChannelRepository(AbstractChannelRepository):
    """Django ORM adapter for AbstractChannelRepository."""

    def create_channel(self, name: str, creator_id: int) -> ChannelEntity:
        channel = Channel.objects.create(
            name=name,
            creator_id=creator_id,
            invite_token=secrets.token_urlsafe(16),
            created_at=timezone.now(),
        )
        return _to_channel_entity(channel)

    def create_topic(self, channel_id: int, title: str) -> TopicEntity:
        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc

        topic = Topic.objects.create(
            title=title, channel=channel, created_at=timezone.now()
        )
        return _to_topic_entity(topic)

    def get_channel(self, channel_id: int) -> ChannelEntity:
        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc
        return _to_channel_entity(channel)

    def get_channel_by_invite_token(self, invite_token: str) -> ChannelEntity:
        try:
            channel = Channel.objects.get(invite_token=invite_token)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc
        return _to_channel_entity(channel)

    def get_topic(self, topic_id: int) -> TopicEntity:
        try:
            topic = Topic.objects.get(id=topic_id)
        except Topic.DoesNotExist as exc:
            raise TopicNotFoundError("Topic not found.") from exc
        return _to_topic_entity(topic)

    def list_topics(self, channel_id: int) -> list[TopicEntity]:
        topics = Topic.objects.filter(channel_id=channel_id)
        return [_to_topic_entity(t) for t in topics]

    def list_channels_for_user(self, user_id: int) -> list[ChannelEntity]:
        channels = Channel.objects.filter(members__user_id=user_id)
        return [_to_channel_entity(c) for c in channels]

    def update_channel(self, channel_id: int, name: str) -> ChannelEntity:
        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc

        channel.name = name
        channel.save(update_fields=["name"])
        return _to_channel_entity(channel)

    def count_active_topics(self, channel_id: int) -> int:
        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc

        return Topic.objects.filter(channel=channel).count()

    def delete_channel(self, channel_id: int) -> None:
        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc
        channel.delete()

    def delete_topic(self, topic_id: int) -> None:
        # The "can't delete the last topic" rule is a business rule owned by
        # DeleteTopicUseCase, not this repository -- don't re-check it here.
        try:
            topic = Topic.objects.get(id=topic_id)
        except Topic.DoesNotExist as exc:
            raise TopicNotFoundError("Topic not found.") from exc
        topic.delete()

    def set_default_topic(self, channel_id: int, topic_id: int) -> ChannelEntity:
        try:
            channel = Channel.objects.get(id=channel_id)
        except Channel.DoesNotExist as exc:
            raise ChannelNotFoundError("Channel not found.") from exc

        try:
            Topic.objects.get(id=topic_id)
        except Topic.DoesNotExist as exc:
            raise TopicNotFoundError("Topic not found.") from exc

        channel.default_topic_id = topic_id
        channel.save(update_fields=["default_topic_id"])
        return _to_channel_entity(channel)

    # -- Membership --

    def add_member(
        self, channel_id: int, user_id: int, nickname_in_channel: str = ""
    ) -> ChannelMemberEntity:
        try:
            member = ChannelMember.objects.create(
                channel_id=channel_id,
                user_id=user_id,
                nickname_in_channel=nickname_in_channel,
            )
        except IntegrityError as exc:
            raise AlreadyChannelMemberError(
                "User is already a member of this channel."
            ) from exc
        return _to_member_entity(member)

    def remove_member(self, channel_id: int, user_id: int) -> None:
        deleted_count, _ = ChannelMember.objects.filter(
            channel_id=channel_id, user_id=user_id
        ).delete()
        if deleted_count == 0:
            raise ChannelMemberNotFoundError("User is not a member of this channel.")
        UserChannelRole.objects.filter(channel_id=channel_id, user_id=user_id).delete()

    def is_member(self, channel_id: int, user_id: int) -> bool:
        return ChannelMember.objects.filter(
            channel_id=channel_id, user_id=user_id
        ).exists()

    def list_members(self, channel_id: int) -> list[ChannelMemberEntity]:
        members = ChannelMember.objects.filter(channel_id=channel_id)
        return [_to_member_entity(m) for m in members]

    def update_member_nickname(
        self, channel_id: int, user_id: int, nickname_in_channel: str
    ) -> ChannelMemberEntity:
        try:
            member = ChannelMember.objects.get(channel_id=channel_id, user_id=user_id)
        except ChannelMember.DoesNotExist as exc:
            raise ChannelMemberNotFoundError(
                "User is not a member of this channel."
            ) from exc

        member.nickname_in_channel = nickname_in_channel
        member.save(update_fields=["nickname_in_channel"])
        return _to_member_entity(member)

    # -- Roles --

    def create_role(
        self, channel_id: int, name: str, permissions: list[str]
    ) -> ChannelRoleEntity:
        try:
            role = ChannelRole.objects.create(
                channel_id=channel_id, name=name, permissions=permissions
            )
        except IntegrityError as exc:
            raise DuplicateRoleNameError(
                f"Channel already has a role named '{name}'."
            ) from exc
        return _to_role_entity(role)

    def get_role(self, role_id: int) -> ChannelRoleEntity:
        try:
            role = ChannelRole.objects.get(id=role_id)
        except ChannelRole.DoesNotExist as exc:
            raise ChannelRoleNotFoundError("Role not found.") from exc
        return _to_role_entity(role)

    def get_role_by_name(self, channel_id: int, name: str) -> ChannelRoleEntity | None:
        role = ChannelRole.objects.filter(channel_id=channel_id, name=name).first()
        return _to_role_entity(role) if role else None

    def list_roles(self, channel_id: int) -> list[ChannelRoleEntity]:
        roles = ChannelRole.objects.filter(channel_id=channel_id)
        return [_to_role_entity(r) for r in roles]

    def update_role(self, role_id: int, permissions: list[str]) -> ChannelRoleEntity:
        try:
            role = ChannelRole.objects.get(id=role_id)
        except ChannelRole.DoesNotExist as exc:
            raise ChannelRoleNotFoundError("Role not found.") from exc

        if role.name == OWNER_ROLE_NAME:
            raise OwnerRoleImmutableError("The Owner role cannot be edited.")

        role.permissions = permissions
        role.save(update_fields=["permissions"])
        return _to_role_entity(role)

    def delete_role(self, role_id: int) -> None:
        try:
            role = ChannelRole.objects.get(id=role_id)
        except ChannelRole.DoesNotExist as exc:
            raise ChannelRoleNotFoundError("Role not found.") from exc

        if role.name == OWNER_ROLE_NAME:
            raise OwnerRoleImmutableError("The Owner role cannot be deleted.")
        role.delete()

    def assign_role(
        self, channel_id: int, user_id: int, role_id: int
    ) -> UserChannelRoleEntity:
        try:
            with transaction.atomic():
                user_role = UserChannelRole.objects.create(
                    channel_id=channel_id, user_id=user_id, role_id=role_id
                )
        except IntegrityError:
            user_role = UserChannelRole.objects.get(
                channel_id=channel_id, user_id=user_id, role_id=role_id
            )
        return _to_user_role_entity(user_role)

    def list_role_assignments(self, channel_id: int) -> list[UserChannelRoleEntity]:
        assignments = UserChannelRole.objects.filter(channel_id=channel_id)
        return [_to_user_role_entity(a) for a in assignments]

    def remove_role_assignment(
        self, channel_id: int, user_id: int, role_id: int
    ) -> bool:
        deleted_count, _ = UserChannelRole.objects.filter(
            channel_id=channel_id, user_id=user_id, role_id=role_id
        ).delete()
        return deleted_count > 0

    def get_user_permissions(self, channel_id: int, user_id: int) -> list[str]:
        roles = ChannelRole.objects.filter(
            assignments__channel_id=channel_id, assignments__user_id=user_id
        )
        permissions: set[str] = set()
        for role in roles:
            permissions.update(_to_role_entity(role).permissions)
        return list(permissions)
