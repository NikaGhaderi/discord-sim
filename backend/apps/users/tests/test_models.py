import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_new_user_receives_default_profile():
    user = get_user_model().objects.create_user(
        username="profile_test_user",
        email="profile-test@example.com",
        password="S3curePassw0rd!",
    )

    assert user.profile.display_name == user.username
    assert user.profile.avatar_url == ""
    assert user.profile.bio == ""
    assert user.profile.allow_group_invitations is True
