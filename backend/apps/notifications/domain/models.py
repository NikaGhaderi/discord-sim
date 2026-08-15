from dataclasses import dataclass
from datetime import datetime


@dataclass
class NotificationEntity:
    notification_id: int
    event_type: str
    payload: dict
    is_read: bool
    created_at: datetime
