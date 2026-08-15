class InvalidMessageTargetError(Exception):
    """Raised unless exactly one supported message target is supplied."""


class MessageTargetNotFoundError(Exception):
    """Raised when the target is absent or inaccessible to the requester."""


class MessageTargetForbiddenError(Exception):
    """Raised when the requester is not a member of the message target."""


class MessageNotFoundError(Exception):
    """Raised when a message is absent or hidden from the requester."""


class MessageEditForbiddenError(Exception):
    """Raised when someone other than the sender attempts an edit."""


class MessageDeleteForbiddenError(Exception):
    """Raised when the requester cannot globally delete the message."""


class MediaAttachmentForbiddenError(Exception):
    """Raised when the requester cannot attach media to the message."""


class InvalidMediaError(Exception):
    """Raised when an uploaded attachment violates file policy."""


class InvalidScheduledTimeError(Exception):
    """Raised when a scheduled message is not set for a future time."""


class ScheduledMessageNotFoundError(Exception):
    """Raised when a scheduled message does not exist."""


class ScheduledMessageCancelForbiddenError(Exception):
    """Raised when someone other than the sender attempts cancellation."""
