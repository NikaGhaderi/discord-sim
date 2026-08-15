from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("private_spaces", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="group",
            name="invite_token",
            field=models.TextField(blank=True, default=""),
        ),
    ]
