from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.messaging.application.interfaces import AbstractRealtimeNotifier


class ChannelsRealtimeNotifier(AbstractRealtimeNotifier):
    def notify(self, group_name: str, event_type: str, payload: dict) -> None:
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            group_name,
            {"type": "broadcast.event", "event_type": event_type, "payload": payload},
        )
