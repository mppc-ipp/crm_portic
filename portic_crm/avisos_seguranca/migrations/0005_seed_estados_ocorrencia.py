from django.db import migrations

ESTADOS_PADRAO = [
    ("ABERTA", "Aberta", "#EF4444", 1),
    ("EM_TRATAMENTO", "Em tratamento", "#F59E0B", 2),
    ("FECHADA", "Fechada", "#22C55E", 3),
]


def criar_estados(apps, schema_editor):
    StatusOcorrencia = apps.get_model("avisos_seguranca", "StatusOcorrencia")
    for codigo, nome, cor, ordem in ESTADOS_PADRAO:
        StatusOcorrencia.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "cor": cor, "ordem": ordem, "ativo": True},
        )


def remover_estados(apps, schema_editor):
    StatusOcorrencia = apps.get_model("avisos_seguranca", "StatusOcorrencia")
    StatusOcorrencia.objects.filter(codigo__in=[c for c, *_ in ESTADOS_PADRAO]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("avisos_seguranca", "0004_statusocorrencia_alter_ocorrenciaseguranca_estado"),
    ]

    operations = [
        migrations.RunPython(criar_estados, remover_estados),
    ]
