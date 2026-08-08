from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messaging.api.serializers import (
    CreateMessageSerializer,
    MediaSerializer,
    MediaUploadSerializer,
    MessageHistorySerializer,
    MessageQuerySerializer,
    MessageSerializer,
    SearchMessageQuerySerializer,
    UpdateMessageSerializer,
)
from apps.messaging.application.use_cases.media import AttachMediaUseCase
from apps.messaging.application.use_cases.messages import (
    DeleteMessageUseCase,
    EditMessageUseCase,
    ListMessagesUseCase,
    SearchMessagesUseCase,
    SendMessageUseCase,
)
from apps.messaging.domain.exceptions import (
    InvalidMediaError,
    MediaAttachmentForbiddenError,
    MessageDeleteForbiddenError,
    MessageEditForbiddenError,
    MessageNotFoundError,
    MessageTargetNotFoundError,
)
from apps.messaging.repositories import DjangoMessagingRepository


def _detail(message, status_code):
    return Response({"detail": message}, status=status_code)


def _target_kwargs(validated_data):
    return {
        "topic_id": validated_data.get("topic_id"),
        "group_id": validated_data.get("group_id"),
        "direct_chat_id": validated_data.get("direct_chat_id"),
    }


def _page_response(page):
    return Response(
        {
            "count": page.count,
            "results": MessageHistorySerializer(page.results, many=True).data,
        },
        status=200,
    )


class MessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MessageQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            page = ListMessagesUseCase(DjangoMessagingRepository()).execute(
                request.user.id,
                **_target_kwargs(data),
                limit=data["limit"],
                offset=data["offset"],
            )
        except MessageTargetNotFoundError as exc:
            return _detail(str(exc), 404)
        return _page_response(page)

    def post(self, request):
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            message = SendMessageUseCase(DjangoMessagingRepository()).execute(
                request.user.id,
                data["content"],
                **_target_kwargs(data),
            )
        except MessageTargetNotFoundError as exc:
            return _detail(str(exc), 404)
        return Response(MessageSerializer(message).data, status=201)


class MessageSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = SearchMessageQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            page = SearchMessagesUseCase(DjangoMessagingRepository()).execute(
                request.user.id,
                data["q"],
                **_target_kwargs(data),
                limit=data["limit"],
                offset=data["offset"],
            )
        except MessageTargetNotFoundError as exc:
            return _detail(str(exc), 404)
        return _page_response(page)


class MessageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, base_message_id):
        serializer = UpdateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            message = EditMessageUseCase(DjangoMessagingRepository()).execute(
                base_message_id,
                request.user.id,
                serializer.validated_data["content"],
            )
        except MessageNotFoundError as exc:
            return _detail(str(exc), 404)
        except MessageEditForbiddenError as exc:
            return _detail(str(exc), 403)
        return Response(MessageSerializer(message).data, status=200)

    def delete(self, request, base_message_id):
        try:
            DeleteMessageUseCase(DjangoMessagingRepository()).execute(
                base_message_id, request.user.id
            )
        except MessageNotFoundError as exc:
            return _detail(str(exc), 404)
        except MessageDeleteForbiddenError as exc:
            return _detail(str(exc), 403)
        return Response(status=204)


class MessageMediaView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, base_message_id):
        serializer = MediaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        try:
            media = AttachMediaUseCase(DjangoMessagingRepository()).execute(
                base_message_id=base_message_id,
                user_id=request.user.id,
                uploaded_file=uploaded_file,
                file_type=uploaded_file.content_type or "application/octet-stream",
                file_size=uploaded_file.size,
            )
        except InvalidMediaError as exc:
            return _detail(str(exc), 400)
        except MediaAttachmentForbiddenError as exc:
            return _detail(str(exc), 403)
        return Response(MediaSerializer(media).data, status=201)
