from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0009_objetivo_empresa"),
    ]

    operations = [
        migrations.AddField(
            model_name="objetivo",
            name="urgente",
            field=models.BooleanField(default=False),
        ),
    ]
