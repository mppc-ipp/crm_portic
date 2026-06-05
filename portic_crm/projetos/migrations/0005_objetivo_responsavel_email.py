from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0004_membroprojeto"),
    ]

    operations = [
        migrations.AddField(
            model_name="objetivo",
            name="responsavel_email",
            field=models.EmailField(blank=True, default=""),
        ),
    ]
