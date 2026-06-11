from django.db import migrations, models


def criar_dados_iniciais(apps, schema_editor):
    StatusCandidatura = apps.get_model("startups", "StatusCandidatura")
    TipoHistoricoCandidatura = apps.get_model("startups", "TipoHistoricoCandidatura")

    estados = [
        ("SUBMETIDA", "Submetida", "#3B82F6", 1),
        ("EM_ANALISE", "Em análise", "#F59E0B", 2),
        ("APROVADA", "Aprovada", "#10B981", 3),
        ("REJEITADA", "Rejeitada", "#EF4444", 4),
        ("INCUBADA", "Incubada", "#8B5CF6", 5),
    ]
    for codigo, nome, cor, ordem in estados:
        StatusCandidatura.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "cor": cor, "ordem": ordem, "ativo": True},
        )

    tipos = [
        ("CHAMADA", "Chamada telefónica", 1),
        ("EMAIL", "Email", 2),
        ("REUNIAO", "Reunião", 3),
        ("NOTA_INTERNA", "Nota interna", 4),
    ]
    for codigo, nome, ordem in tipos:
        TipoHistoricoCandidatura.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "ordem": ordem, "ativo": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("startups", "0002_candidatura_contactado"),
    ]

    operations = [
        migrations.CreateModel(
            name="StatusCandidatura",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("codigo", models.CharField(max_length=40, unique=True)),
                ("nome", models.CharField(max_length=120)),
                ("cor", models.CharField(default="#6B7280", max_length=7)),
                ("ordem", models.PositiveIntegerField(default=0)),
                ("ativo", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "estado de candidatura",
                "verbose_name_plural": "estados de candidatura",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.CreateModel(
            name="TipoHistoricoCandidatura",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("codigo", models.CharField(max_length=40, unique=True)),
                ("nome", models.CharField(max_length=120)),
                ("ordem", models.PositiveIntegerField(default=0)),
                ("ativo", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "tipo de histórico de candidatura",
                "verbose_name_plural": "tipos de histórico de candidatura",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.AlterField(
            model_name="candidatura",
            name="estado",
            field=models.CharField(default="SUBMETIDA", max_length=40),
        ),
        migrations.RunPython(criar_dados_iniciais, migrations.RunPython.noop),
    ]
