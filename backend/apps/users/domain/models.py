from dataclasses import dataclass


@dataclass
class UserProfileEntity:
    user_id: int
    username: str
    display_name: str
    avatar_url: str
    bio: str
    allow_group_invitations: bool
