from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("projetos", "0005_objetivo_responsavel_email"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Notificacao",
        ),
    ]
