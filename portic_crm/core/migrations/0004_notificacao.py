import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0003_historico_tipo_livre"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notificacao",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("CANDIDATURA_NOVA", "Nova candidatura"),
                            ("CANDIDATURA_ESTADO", "Estado de candidatura"),
                            ("CONTRATO_EXPIRAR", "Contrato a expirar"),
                            ("RESERVA_PENDENTE", "Reserva pendente"),
                            ("TAREFA_PRAZO", "Tarefa com prazo"),
                            ("EVENTO_PROXIMO", "Evento próximo"),
                            ("SISTEMA", "Sistema"),
                        ],
                        max_length=40,
                    ),
                ),
                ("titulo", models.CharField(max_length=255)),
                ("mensagem", models.TextField(blank=True)),
                ("url", models.CharField(blank=True, max_length=500)),
                ("lida", models.BooleanField(default=False)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "utilizador",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificacoes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "notificação",
                "verbose_name_plural": "notificações",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notificacao",
            index=models.Index(fields=["utilizador", "lida", "-created_at"], name="core_notifi_utiliza_idx"),
        ),
    ]
