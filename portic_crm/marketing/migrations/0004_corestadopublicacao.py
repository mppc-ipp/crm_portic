from django.db import migrations, models


def criar_cores_padrao(apps, schema_editor):
    CorEstadoPublicacao = apps.get_model("marketing", "CorEstadoPublicacao")
    estados = [
        ("RASCUNHO", "Rascunho", "#64748B", 1),
        ("AGENDADO", "Agendado", "#F59E0B", 2),
        ("A_PUBLICAR", "A publicar", "#3B82F6", 3),
        ("PUBLICADO", "Publicado", "#22C55E", 4),
        ("PARCIAL", "Parcial", "#F97316", 5),
        ("FALHOU", "Falhou", "#EF4444", 6),
        ("CANCELADO", "Cancelado", "#94A3B8", 7),
    ]
    for codigo, nome, cor, ordem in estados:
        CorEstadoPublicacao.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "cor": cor, "ordem": ordem},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("marketing", "0003_plataforma_tiktok"),
    ]

    operations = [
        migrations.CreateModel(
            name="CorEstadoPublicacao",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("codigo", models.CharField(max_length=20, unique=True)),
                ("nome", models.CharField(max_length=120)),
                ("cor", models.CharField(default="#6B7280", max_length=7)),
                ("ordem", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "cor de estado de publicação",
                "verbose_name_plural": "cores de estados de publicação",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.RunPython(criar_cores_padrao, migrations.RunPython.noop),
    ]
