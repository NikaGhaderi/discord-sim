class ChannelNotFoundError(Exception):
    """Raised when a requested channel does not exist."""


class TopicNotFoundError(Exception):
    """Raised when a requested topic from a channel does not exist."""


class LastTopicDeletionError(Exception):
    """Raised when a user tries to delete the last topic of a channel."""
