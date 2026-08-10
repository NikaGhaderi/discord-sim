from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.api.serializers import NotificationSerializer
from apps.notifications.application.use_cases.list_notifications import (
    ListNotificationsUseCase,
)
from apps.notifications.repositories import DjangoNotificationsRepository


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = ListNotificationsUseCase(DjangoNotificationsRepository()).execute(
            request.user.id
        )
        return Response(NotificationSerializer(notifications, many=True).data, status=200)
