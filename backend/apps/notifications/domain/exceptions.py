class NotificationNotFoundError(Exception):
    """Raised when a notification is absent or belongs to someone else --
    deliberately indistinguishable from the caller's perspective, so a
    stranger's notification id can't be probed for existence."""
