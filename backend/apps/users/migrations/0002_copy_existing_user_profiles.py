from django.db import migrations


def copy_existing_user_profiles(apps, schema_editor):
    User = apps.get_model("authentication", "User")
    Profile = apps.get_model("users", "Profile")

    Profile.objects.bulk_create(
        [
            Profile(
                user_id=user.id,
                display_name=user.username,
                allow_group_invitations=user.allow_group_invitations,
            )
            for user in User.objects.all().iterator()
        ],
        ignore_conflicts=True,
    )


def restore_invitation_settings(apps, schema_editor):
    User = apps.get_model("authentication", "User")
    Profile = apps.get_model("users", "Profile")

    for profile in Profile.objects.all().iterator():
        User.objects.filter(id=profile.user_id).update(
            allow_group_invitations=profile.allow_group_invitations
        )


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            copy_existing_user_profiles,
            restore_invitation_settings,
        )
    ]
