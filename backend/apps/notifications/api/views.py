from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.api.serializers import (
    NotificationSerializer,
    UpdateNotificationSerializer,
)
from apps.notifications.application.use_cases.list_notifications import (
    ListNotificationsUseCase,
)
from apps.notifications.application.use_cases.mark_notification_read import (
    MarkNotificationReadUseCase,
)
from apps.notifications.domain.exceptions import NotificationNotFoundError
from apps.notifications.repositories import DjangoNotificationsRepository


def _detail(message, status_code):
    return Response({"detail": message}, status=status_code)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = ListNotificationsUseCase(DjangoNotificationsRepository()).execute(
            request.user.id
        )
        return Response(NotificationSerializer(notifications, many=True).data, status=200)


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        serializer = UpdateNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            notification = MarkNotificationReadUseCase(
                DjangoNotificationsRepository()
            ).execute(
                notification_id,
                request.user.id,
                serializer.validated_data["is_read"],
            )
        except NotificationNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(NotificationSerializer(notification).data, status=200)
