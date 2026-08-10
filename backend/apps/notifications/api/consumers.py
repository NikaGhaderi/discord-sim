from channels.generic.websocket import AsyncJsonWebsocketConsumer

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close()
            return
        self.groups_joined = []
        await self.accept()
        # client sends {"action": "subscribe", "group": "topic_5"} per room it's viewing

    async def receive_json(self, content):
        group = content.get("group")
        if content.get("action") == "subscribe" and group:
            await self.channel_layer.group_add(group, self.channel_name)
            self.groups_joined.append(group)

    async def disconnect(self, code):
        for group in getattr(self, "groups_joined", []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def broadcast_event(self, event):
        await self.send_json({"event_type": event["event_type"], "data": event["payload"]})
