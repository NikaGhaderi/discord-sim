from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.api.serializers import (
    AvatarUploadSerializer,
    OwnProfileSerializer,
    PublicProfileSerializer,
    UpdateProfileSerializer,
    UserIdsQuerySerializer,
)
from apps.users.application.use_cases.get_profile import (
    GetOwnProfileUseCase,
    GetPublicProfileUseCase,
    ListPublicProfilesByIdsUseCase,
)
from apps.users.application.use_cases.update_profile import UpdateProfileUseCase
from apps.users.application.use_cases.upload_avatar import UploadAvatarUseCase
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.repositories import DjangoProfileRepository


def _profile_not_found_response():
    return Response({"detail": "Profile not found."}, status=404)


class OwnProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = GetOwnProfileUseCase(DjangoProfileRepository()).execute(
                request.user.id
            )
        except ProfileNotFoundError:
            return _profile_not_found_response()
        return Response(OwnProfileSerializer(profile).data, status=200)

    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            profile = UpdateProfileUseCase(DjangoProfileRepository()).execute(
                request.user.id,
                **serializer.validated_data,
            )
        except ProfileNotFoundError:
            return _profile_not_found_response()
        return Response(OwnProfileSerializer(profile).data, status=200)


class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            profile = UploadAvatarUseCase(DjangoProfileRepository()).execute(
                request.user.id,
                serializer.validated_data["avatar"],
            )
        except ProfileNotFoundError:
            return _profile_not_found_response()
        return Response(OwnProfileSerializer(profile).data, status=200)


class PublicProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        try:
            profile = GetPublicProfileUseCase(DjangoProfileRepository()).execute(
                username
            )
        except ProfileNotFoundError:
            return _profile_not_found_response()
        return Response(PublicProfileSerializer(profile).data, status=200)


class UsersByIdsView(APIView):
    """Bulk-resolves raw user ids to public profiles: `?ids=1,2,3`.

    Not in the Phase 1 doc's contract -- added so callers that only carry
    user ids (private_spaces' DMs, group invitations, group members) can
    resolve usernames without a lookup per id. Ids that don't resolve to a
    real user are silently omitted from the response, not errored -- this
    is a batch-resolve endpoint, not an existence check.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserIdsQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        profiles = ListPublicProfilesByIdsUseCase(DjangoProfileRepository()).execute(
            serializer.validated_data["ids"]
        )
        return Response(PublicProfileSerializer(profiles, many=True).data, status=200)
