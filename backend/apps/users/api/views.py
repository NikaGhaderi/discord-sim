from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.api.serializers import (
    OwnProfileSerializer,
    PublicProfileSerializer,
    UpdateProfileSerializer,
)
from apps.users.application.use_cases.get_profile import (
    GetOwnProfileUseCase,
    GetPublicProfileUseCase,
)
from apps.users.application.use_cases.update_profile import UpdateProfileUseCase
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
