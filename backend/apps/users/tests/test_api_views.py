from types import SimpleNamespace
from unittest.mock import patch

from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.api.views import OwnProfileView, PublicProfileView, UsersByIdsView
from apps.users.domain.exceptions import ProfileNotFoundError
from apps.users.domain.models import UserProfileEntity


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
