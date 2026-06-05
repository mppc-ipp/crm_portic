import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projetos", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="objetivo",
            name="data_inicio",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="Subtarefa",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("titulo", models.CharField(max_length=255)),
                ("concluida", models.BooleanField(default=False)),
                ("ordem", models.PositiveIntegerField(default=0)),
                (
                    "objetivo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subtarefas",
                        to="projetos.objetivo",
                    ),
                ),
            ],
            options={
                "verbose_name": "subtarefa",
                "verbose_name_plural": "subtarefas",
                "ordering": ["ordem", "id"],
            },
        ),
        migrations.CreateModel(
            name="ComentarioObjetivo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("texto", models.TextField()),
                (
                    "autor",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="comentarios_objetivo",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "objetivo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comentarios",
                        to="projetos.objetivo",
                    ),
                ),
            ],
            options={
                "verbose_name": "comentário",
                "verbose_name_plural": "comentários",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="CampoPersonalizado",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(max_length=120)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("TEXTO", "Texto"),
                            ("NUMERO", "Número"),
                            ("DATA", "Data"),
                            ("SELECAO", "Seleção"),
                        ],
                        max_length=10,
                    ),
                ),
                ("opcoes", models.JSONField(blank=True, default=list)),
                ("ordem", models.PositiveIntegerField(default=0)),
                (
                    "projeto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="campos_personalizados",
                        to="projetos.projeto",
                    ),
                ),
            ],
            options={
                "verbose_name": "campo personalizado",
                "verbose_name_plural": "campos personalizados",
                "ordering": ["ordem", "id"],
                "unique_together": {("projeto", "nome")},
            },
        ),
        migrations.CreateModel(
            name="ValorCampoPersonalizado",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("valor_texto", models.CharField(blank=True, max_length=500)),
                ("valor_numero", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("valor_data", models.DateField(blank=True, null=True)),
                (
                    "campo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="valores",
                        to="projetos.campopersonalizado",
                    ),
                ),
                (
                    "objetivo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="valores_campos",
                        to="projetos.objetivo",
                    ),
                ),
            ],
            options={
                "verbose_name": "valor de campo personalizado",
                "verbose_name_plural": "valores de campos personalizados",
                "unique_together": {("objetivo", "campo")},
            },
        ),
        migrations.CreateModel(
            name="DependenciaObjetivo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                (
                    "predecessora",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dependencias_saida",
                        to="projetos.objetivo",
                    ),
                ),
                (
                    "sucessora",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dependencias_entrada",
                        to="projetos.objetivo",
                    ),
                ),
            ],
            options={
                "verbose_name": "dependência",
                "verbose_name_plural": "dependências",
                "unique_together": {("predecessora", "sucessora")},
            },
        ),
        migrations.CreateModel(
            name="VistaGuardada",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("nome", models.CharField(max_length=120)),
                (
                    "tipo_vista",
                    models.CharField(
                        choices=[
                            ("lista", "Lista"),
                            ("quadro", "Quadro"),
                            ("calendario", "Calendário"),
                            ("timeline", "Timeline"),
                        ],
                        max_length=12,
                    ),
                ),
                ("filtros", models.JSONField(blank=True, default=dict)),
                ("padrao", models.BooleanField(default=False)),
                (
                    "projeto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="vistas_guardadas",
                        to="projetos.projeto",
                    ),
                ),
                (
                    "utilizador",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="vistas_projetos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "vista guardada",
                "verbose_name_plural": "vistas guardadas",
                "ordering": ["-padrao", "nome"],
                "unique_together": {("projeto", "utilizador", "nome")},
            },
        ),
        migrations.CreateModel(
            name="AtividadeProjeto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("acao", models.CharField(max_length=80)),
                ("descricao", models.TextField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "objetivo",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="atividades",
                        to="projetos.objetivo",
                    ),
                ),
                (
                    "projeto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="atividades",
                        to="projetos.projeto",
                    ),
                ),
                (
                    "utilizador",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="atividades_projetos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "atividade de projeto",
                "verbose_name_plural": "atividades de projeto",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Notificacao",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("titulo", models.CharField(max_length=255)),
                ("mensagem", models.TextField()),
                ("lida", models.BooleanField(default=False)),
                ("url", models.CharField(blank=True, max_length=500)),
                (
                    "destinatario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificacoes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "objetivo",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notificacoes",
                        to="projetos.objetivo",
                    ),
                ),
                (
                    "projeto",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificacoes",
                        to="projetos.projeto",
                    ),
                ),
            ],
            options={
                "verbose_name": "notificação",
                "verbose_name_plural": "notificações",
                "ordering": ["-created_at"],
            },
        ),
    ]
