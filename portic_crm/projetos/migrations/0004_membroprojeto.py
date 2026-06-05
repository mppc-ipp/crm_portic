from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projetos", "0003_projeto_cor"),
    ]

    operations = [
        migrations.CreateModel(
            name="MembroProjeto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254)),
                (
                    "projeto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="membros",
                        to="projetos.projeto",
                    ),
                ),
                (
                    "utilizador",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="membros_projeto",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "membro de projeto",
                "verbose_name_plural": "membros de projeto",
                "unique_together": {("projeto", "email")},
            },
        ),
    ]
