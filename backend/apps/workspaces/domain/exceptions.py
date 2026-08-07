class ChannelNotFoundError(Exception):
    """Raised when a requested channel does not exist."""


class TopicNotFoundError(Exception):
    """Raised when a requested topic from a channel does not exist."""


class LastTopicDeletionError(Exception):
    """Raised when a user tries to delete the last topic of a channel."""


class ChannelMemberNotFoundError(Exception):
    """Raised when a user is not a member of a channel."""


class AlreadyChannelMemberError(Exception):
    """Raised when a user tries to join a channel they're already a member of."""


class ChannelRoleNotFoundError(Exception):
    """Raised when a requested channel role does not exist."""


class DuplicateRoleNameError(Exception):
    """Raised when a channel already has a role with the requested name."""


class OwnerRoleImmutableError(Exception):
    """Raised when a user tries to delete a channel's Owner role."""


class InvalidPermissionCodeError(Exception):
    """Raised when a role is assigned a permission string outside the catalog."""


class InvalidInviteTokenError(Exception):
    """Raised when a channel invite token doesn't match any channel."""
