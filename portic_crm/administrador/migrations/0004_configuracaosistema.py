from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("administrador", "0003_utilizador_comum_sem_espacos"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConfiguracaoSistema",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "backup_frequencia",
                    models.CharField(
                        choices=[("diaria", "Diária"), ("semanal", "Semanal"), ("mensal", "Mensal")],
                        default="diaria",
                        max_length=20,
                    ),
                ),
                ("backup_retencao_dias", models.PositiveIntegerField(default=30)),
                (
                    "backup_localizacao",
                    models.CharField(blank=True, default="Volume Docker postgres_data + media_data", max_length=255),
                ),
                (
                    "backup_automatico",
                    models.BooleanField(
                        default=False,
                        help_text="Indica se existe rotina automática configurada no servidor.",
                    ),
                ),
                ("backup_ultimo", models.DateTimeField(blank=True, null=True)),
                ("backup_notas", models.TextField(blank=True)),
                ("notas_manutencao", models.TextField(blank=True)),
                (
                    "politica_seguranca_notas",
                    models.TextField(blank=True, help_text="Notas internas sobre política de segurança e acessos."),
                ),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "configuração do sistema",
                "verbose_name_plural": "configurações do sistema",
            },
        ),
    ]
