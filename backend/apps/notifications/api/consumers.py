from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close()
            return
        self.groups_joined = []
        await self.accept()
        # Every connected user auto-joins their own personal group so bell
        # notifications (NEW_NOTIFICATION) reach them without an explicit
        # subscribe -- unlike topic/group/direct_chat rooms below, which the
        # client only joins for whatever it's actively viewing.
        user_group = f"user_{self.scope['user'].id}"
        await self.channel_layer.group_add(user_group, self.channel_name)
        self.groups_joined.append(user_group)
        # client sends {"action": "subscribe", "group": "topic_5"} per room it's viewing

    async def receive_json(self, content):
        group = content.get("group")
        if content.get("action") == "subscribe" and group:
            await self.channel_layer.group_add(group, self.channel_name)
            self.groups_joined.append(group)
            await self.send_json(
                {
                    "event_type": "SUBSCRIBED",
                    "data": {"group": group},
                }
            )

    async def disconnect(self, code):
        for group in getattr(self, "groups_joined", []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def broadcast_event(self, event):
        await self.send_json(
            {"event_type": event["event_type"], "data": event["payload"]}
        )
