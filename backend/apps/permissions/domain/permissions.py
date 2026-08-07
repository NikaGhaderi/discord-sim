from enum import Enum


class PermissionCode(str, Enum):
    MANAGE_CHANNEL = "MANAGE_CHANNEL"
    MANAGE_ROLES = "MANAGE_ROLES"
    MANAGE_TOPICS = "MANAGE_TOPICS"
    DELETE_MESSAGES = "DELETE_MESSAGES"
    KICK_MEMBERS = "KICK_MEMBERS"
    SEND_MEDIA = "SEND_MEDIA"

    def __str__(self):
        return self.value

    def __repr__(self):
        return self.value
