from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("startups", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="candidatura",
            name="contactado",
            field=models.BooleanField(
                default=False,
                help_text="Marcar quando a candidatura foi contactada / concluída.",
            ),
        ),
    ]
