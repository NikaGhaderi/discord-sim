from django.db import migrations


def backfill_send_messages(apps, schema_editor):
    ChannelRole = apps.get_model("workspaces", "ChannelRole")
    for role in ChannelRole.objects.filter(name="@everyone"):
        if "SEND_MESSAGES" not in role.permissions:
            role.permissions = [*role.permissions, "SEND_MESSAGES"]
            role.save(update_fields=("permissions",))


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0002_channelmember_channelrole_userchannelrole_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_send_messages, noop_reverse),
    ]
