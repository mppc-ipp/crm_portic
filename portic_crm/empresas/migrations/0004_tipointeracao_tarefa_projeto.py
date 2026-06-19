from django.db import migrations


def seed_tarefa_projeto(apps, schema_editor):
    TipoInteracao = apps.get_model("empresas", "TipoInteracao")
    TipoInteracao.objects.get_or_create(
        codigo="TAREFA_PROJETO",
        defaults={"nome": "Tarefa de projeto", "ordem": 4, "ativo": True},
    )


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0003_tipointeracao"),
    ]

    operations = [
        migrations.RunPython(seed_tarefa_projeto, migrations.RunPython.noop),
    ]
