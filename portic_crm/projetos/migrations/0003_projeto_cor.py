from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projetos", "0002_asana_features"),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="cor",
            field=models.CharField(default="#1e3a5f", max_length=7),
        ),
    ]
