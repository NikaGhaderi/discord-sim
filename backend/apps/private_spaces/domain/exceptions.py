class DirectChatNotFoundError(Exception):
    """Raised when a chat doesn't exist, or the requester isn't a participant."""


class SelfDirectChatError(Exception):
    """Raised when a user tries to open a direct chat with themselves."""


class UserNotFoundError(Exception):
    """Raised when a referenced target/invitee user id does not exist."""


class GroupNotFoundError(Exception):
    """Raised when a requested group does not exist, or the requester isn't a member."""


class GroupMembershipNotFoundError(Exception):
    """Raised when a user tries to leave a group they aren't a member of."""


class InviteeNotFoundError(Exception):
    """Raised when a group invitation's target user does not exist."""


class InvitationsDisabledError(Exception):
    """Raised when inviting a user who has disabled group invitations."""


class AlreadyGroupMemberError(Exception):
    """Raised when inviting a user who is already a member of the group."""


class InvitationNotFoundError(Exception):
    """Raised when responding to an invitation that's missing, not pending,
    or not the responder's own."""
