import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RegistroTeletrabalho",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("ENTRADA_MANHA", "Entrada manhã"),
                            ("SAIDA_MANHA", "Saída manhã"),
                            ("ENTRADA_TARDE", "Entrada tarde"),
                            ("SAIDA_TARDE", "Saída tarde"),
                        ],
                        max_length=20,
                    ),
                ),
                ("observacao", models.TextField(blank=True)),
                (
                    "utilizador",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="registos_teletrabalho",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "registo de teletrabalho",
                "verbose_name_plural": "registos de teletrabalho",
                "ordering": ["-created_at"],
                "permissions": [
                    ("view_teletrabalho", "Ver teletrabalho"),
                    ("gerir_teletrabalho", "Gerir registos de teletrabalho"),
                ],
            },
        ),
    ]
