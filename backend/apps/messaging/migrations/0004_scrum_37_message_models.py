import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models
from django.db.models import Q


def move_fields_to_child_tables(apps, schema_editor):
    BaseMessage = apps.get_model("messaging", "BaseMessage")
    Message = apps.get_model("messaging", "Message")
    ScheduledMessage = apps.get_model("messaging", "ScheduledMessage")

    for message in Message.objects.all().iterator():
        Message.objects.filter(pk=message.pk).update(
            topic_id=message.legacy_topic_id,
            group_id=message.legacy_group_id,
            direct_chat_id=message.legacy_direct_chat_id,
            body=message.legacy_body,
        )
        BaseMessage.objects.filter(pk=message.pk).update(created_at=message.sent_at)

    for scheduled in ScheduledMessage.objects.all().iterator():
        ScheduledMessage.objects.filter(pk=scheduled.pk).update(
            topic_id=scheduled.legacy_topic_id,
            group_id=scheduled.legacy_group_id,
            direct_chat_id=scheduled.legacy_direct_chat_id,
            body=scheduled.legacy_body,
        )


def move_fields_back_to_parent_table(apps, schema_editor):
    BaseMessage = apps.get_model("messaging", "BaseMessage")
    Message = apps.get_model("messaging", "Message")
    ScheduledMessage = apps.get_model("messaging", "ScheduledMessage")

    for message in Message.objects.all().iterator():
        Message.objects.filter(pk=message.pk).update(sent_at=message.created_at)
        BaseMessage.objects.filter(pk=message.pk).update(
            legacy_topic_id=message.topic_id,
            legacy_group_id=message.group_id,
            legacy_direct_chat_id=message.direct_chat_id,
            legacy_body=message.body,
        )

    for scheduled in ScheduledMessage.objects.all().iterator():
        BaseMessage.objects.filter(pk=scheduled.pk).update(
            legacy_topic_id=scheduled.topic_id,
            legacy_group_id=scheduled.group_id,
            legacy_direct_chat_id=scheduled.direct_chat_id,
            legacy_body=scheduled.body,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0003_media_thumbnail"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="basemessage",
            name="messaging_exactly_one_target",
        ),
        migrations.RemoveIndex(
            model_name="basemessage",
            name="messaging_topic_message_idx",
        ),
        migrations.RemoveIndex(
            model_name="basemessage",
            name="messaging_group_message_idx",
        ),
        migrations.RemoveIndex(
            model_name="basemessage",
            name="messaging_dm_message_idx",
        ),
        migrations.AddField(
            model_name="basemessage",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.RenameField(
            model_name="basemessage",
            old_name="content",
            new_name="legacy_body",
        ),
        migrations.RenameField(
            model_name="basemessage",
            old_name="topic",
            new_name="legacy_topic",
        ),
        migrations.RenameField(
            model_name="basemessage",
            old_name="group",
            new_name="legacy_group",
        ),
        migrations.RenameField(
            model_name="basemessage",
            old_name="direct_chat",
            new_name="legacy_direct_chat",
        ),
        migrations.AlterField(
            model_name="basemessage",
            name="legacy_topic",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="workspaces.topic",
            ),
        ),
        migrations.AlterField(
            model_name="basemessage",
            name="legacy_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="private_spaces.group",
            ),
        ),
        migrations.AlterField(
            model_name="basemessage",
            name="legacy_direct_chat",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="private_spaces.directchat",
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="body",
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name="message",
            name="topic",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages",
                to="workspaces.topic",
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages",
                to="private_spaces.group",
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="direct_chat",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages",
                to="private_spaces.directchat",
            ),
        ),
        migrations.AddField(
            model_name="scheduledmessage",
            name="body",
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name="scheduledmessage",
            name="topic",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="scheduled_messages",
                to="workspaces.topic",
            ),
        ),
        migrations.AddField(
            model_name="scheduledmessage",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="scheduled_messages",
                to="private_spaces.group",
            ),
        ),
        migrations.AddField(
            model_name="scheduledmessage",
            name="direct_chat",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="scheduled_messages",
                to="private_spaces.directchat",
            ),
        ),
        migrations.AlterField(
            model_name="basemessage",
            name="legacy_body",
            field=models.TextField(null=True),
        ),
        migrations.AlterField(
            model_name="message",
            name="sent_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.RunPython(move_fields_to_child_tables, move_fields_back_to_parent_table),
        migrations.AlterField(
            model_name="message",
            name="body",
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name="scheduledmessage",
            name="body",
            field=models.TextField(),
        ),
        migrations.RemoveField(
            model_name="message",
            name="sent_at",
        ),
        migrations.RenameField(
            model_name="media",
            old_name="base_message",
            new_name="message",
        ),
        migrations.AlterField(
            model_name="media",
            name="message",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="media",
                to="messaging.message",
            ),
        ),
        migrations.RenameField(
            model_name="media",
            old_name="file_type",
            new_name="content_type",
        ),
        migrations.RenameField(
            model_name="messagehistory",
            old_name="base_message",
            new_name="message",
        ),
        migrations.AlterField(
            model_name="messagehistory",
            name="message",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="history",
                to="messaging.message",
            ),
        ),
        migrations.RenameField(
            model_name="messagehistory",
            old_name="old_content",
            new_name="previous_body",
        ),
        migrations.RemoveField(
            model_name="basemessage",
            name="legacy_body",
        ),
        migrations.RemoveField(
            model_name="basemessage",
            name="legacy_topic",
        ),
        migrations.RemoveField(
            model_name="basemessage",
            name="legacy_group",
        ),
        migrations.RemoveField(
            model_name="basemessage",
            name="legacy_direct_chat",
        ),
        migrations.AlterModelOptions(
            name="message",
            options={"ordering": ("created_at", "id")},
        ),
        migrations.AddConstraint(
            model_name="message",
            constraint=models.CheckConstraint(
                check=(
                    Q(topic__isnull=False, group__isnull=True, direct_chat__isnull=True)
                    | Q(
                        topic__isnull=True,
                        group__isnull=False,
                        direct_chat__isnull=True,
                    )
                    | Q(
                        topic__isnull=True,
                        group__isnull=True,
                        direct_chat__isnull=False,
                    )
                ),
                name="messaging_message_exactly_one_target",
            ),
        ),
        migrations.AddConstraint(
            model_name="scheduledmessage",
            constraint=models.CheckConstraint(
                check=(
                    Q(topic__isnull=False, group__isnull=True, direct_chat__isnull=True)
                    | Q(
                        topic__isnull=True,
                        group__isnull=False,
                        direct_chat__isnull=True,
                    )
                    | Q(
                        topic__isnull=True,
                        group__isnull=True,
                        direct_chat__isnull=False,
                    )
                ),
                name="messaging_scheduled_exactly_one_target",
            ),
        ),
    ]
