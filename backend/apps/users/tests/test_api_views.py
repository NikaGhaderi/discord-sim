import base64
from types import SimpleNamespace
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.api.views import (
    OwnProfileView,
    PublicProfileView,
    UploadAvatarView,
    UsersByIdsView,
)
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.domain.models import UserProfileEntity

# Smallest possible valid PNG -- ImageField's validation actually decodes the
# file, so an arbitrary byte string isn't enough to pass it.
_ONE_PIXEL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY"
    "42YAAAAASUVORK5CYII="
)


def _profile(**overrides) -> UserProfileEntity:
    fields = {
        "user_id": 1,
        "username": "nika_gh",
        "display_name": "Nika Ghaderi",
        "avatar_url": "https://storage/avatars/nika.jpg",
        "bio": "Backend Developer",
        "allow_group_invitations": True,
    }
    fields.update(overrides)
    return UserProfileEntity(**fields)


def _authenticate(request, user_id=1):
    force_authenticate(
        request,
        user=SimpleNamespace(is_authenticated=True, id=user_id),
    )
    return request


class TestOwnProfileView:
    @patch("apps.users.api.views.GetOwnProfileUseCase")
    def test_get_matches_phase_one_owner_contract(self, use_case_class):
        use_case_class.return_value.execute.return_value = _profile()
        request = _authenticate(APIRequestFactory().get("/api/users/me/profile/"))

        response = OwnProfileView.as_view()(request)

        assert response.status_code == 200
        assert response.data == {
            "user_id": 1,
            "username": "nika_gh",
            "display_name": "Nika Ghaderi",
            "avatar_url": "https://storage/avatars/nika.jpg",
            "bio": "Backend Developer",
            "allow_group_invitations": True,
        }
        use_case_class.return_value.execute.assert_called_once_with(1)

    @patch("apps.users.api.views.UpdateProfileUseCase")
    def test_patch_matches_phase_one_owner_contract(self, use_case_class):
        use_case_class.return_value.execute.return_value = _profile(
            display_name="Nika",
            bio="Updating my bio for the sprint!",
            allow_group_invitations=False,
        )
        request = _authenticate(
            APIRequestFactory().patch(
                "/api/users/me/profile/",
                {
                    "display_name": "Nika",
                    "bio": "Updating my bio for the sprint!",
                    "allow_group_invitations": False,
                },
                format="json",
            )
        )

        response = OwnProfileView.as_view()(request)

        assert response.status_code == 200
        assert response.data == {
            "user_id": 1,
            "username": "nika_gh",
            "display_name": "Nika",
            "avatar_url": "https://storage/avatars/nika.jpg",
            "bio": "Updating my bio for the sprint!",
            "allow_group_invitations": False,
        }
        use_case_class.return_value.execute.assert_called_once_with(
            1,
            display_name="Nika",
            bio="Updating my bio for the sprint!",
            allow_group_invitations=False,
        )


class TestUploadAvatarView:
    @patch("apps.users.api.views.UploadAvatarUseCase")
    def test_post_uploads_and_returns_the_updated_profile(self, use_case_class):
        use_case_class.return_value.execute.return_value = _profile(
            avatar_url="/media/avatars/2026/08/13/photo.png"
        )
        avatar = SimpleUploadedFile("photo.png", _ONE_PIXEL_PNG, "image/png")
        request = _authenticate(
            APIRequestFactory().post(
                "/api/users/me/avatar/", {"avatar": avatar}, format="multipart"
            )
        )

        response = UploadAvatarView.as_view()(request)

        assert response.status_code == 200
        assert response.data["avatar_url"] == "/media/avatars/2026/08/13/photo.png"
        use_case_class.return_value.execute.assert_called_once()
        called_args = use_case_class.return_value.execute.call_args
        assert called_args.args[0] == 1
        assert called_args.args[1].name == "photo.png"

    def test_post_without_a_file_returns_400(self):
        request = _authenticate(
            APIRequestFactory().post("/api/users/me/avatar/", {}, format="multipart")
        )

        response = UploadAvatarView.as_view()(request)

        assert response.status_code == 400

    @patch("apps.users.api.views.UploadAvatarUseCase")
    def test_post_returns_404_when_profile_is_missing(self, use_case_class):
        use_case_class.return_value.execute.side_effect = ProfileNotFoundError(
            "Profile not found."
        )
        avatar = SimpleUploadedFile("photo.png", _ONE_PIXEL_PNG, "image/png")
        request = _authenticate(
            APIRequestFactory().post(
                "/api/users/me/avatar/", {"avatar": avatar}, format="multipart"
            )
        )

        response = UploadAvatarView.as_view()(request)

        assert response.status_code == 404


class TestPublicProfileView:
    @patch("apps.users.api.views.GetPublicProfileUseCase")
    def test_get_omits_private_invitation_flag(self, use_case_class):
        use_case_class.return_value.execute.return_value = _profile(
            user_id=2,
            username="samyar_l",
            display_name="Samyar Lajevardi",
            avatar_url="https://storage/avatars/samyar.jpg",
            bio="Product Owner",
            allow_group_invitations=False,
        )
        request = _authenticate(APIRequestFactory().get("/api/users/samyar_l/profile/"))

        response = PublicProfileView.as_view()(request, username="samyar_l")

        assert response.status_code == 200
        assert response.data == {
            "user_id": 2,
            "username": "samyar_l",
            "display_name": "Samyar Lajevardi",
            "avatar_url": "https://storage/avatars/samyar.jpg",
            "bio": "Product Owner",
        }
        assert "allow_group_invitations" not in response.data

    @patch("apps.users.api.views.GetPublicProfileUseCase")
    def test_unknown_username_returns_404(self, use_case_class):
        use_case_class.return_value.execute.side_effect = ProfileNotFoundError(
            "Profile not found."
        )
        request = _authenticate(APIRequestFactory().get("/api/users/unknown/profile/"))

        response = PublicProfileView.as_view()(request, username="unknown")

        assert response.status_code == 404
        assert response.data == {"detail": "Profile not found."}


class TestUsersByIdsView:
    @patch("apps.users.api.views.ListPublicProfilesByIdsUseCase")
    def test_returns_public_profiles_for_valid_ids(self, use_case_class):
        use_case_class.return_value.execute.return_value = [
            _profile(user_id=1),
            _profile(user_id=2, username="samyar_l"),
        ]
        request = _authenticate(
            APIRequestFactory().get("/api/users/by-ids/", {"ids": "1,2,999"})
        )

        response = UsersByIdsView.as_view()(request)

        assert response.status_code == 200
        assert [p["user_id"] for p in response.data] == [1, 2]
        assert "allow_group_invitations" not in response.data[0]
        use_case_class.return_value.execute.assert_called_once_with([1, 2, 999])

    def test_missing_ids_param_returns_400(self):
        request = _authenticate(APIRequestFactory().get("/api/users/by-ids/"))

        response = UsersByIdsView.as_view()(request)

        assert response.status_code == 400

    def test_non_integer_ids_returns_400(self):
        request = _authenticate(
            APIRequestFactory().get("/api/users/by-ids/", {"ids": "1,abc"})
        )

        response = UsersByIdsView.as_view()(request)

        assert response.status_code == 400

    def test_too_many_ids_returns_400(self):
        ids = ",".join(str(i) for i in range(101))
        request = _authenticate(
            APIRequestFactory().get("/api/users/by-ids/", {"ids": ids})
        )

        response = UsersByIdsView.as_view()(request)

        assert response.status_code == 400
