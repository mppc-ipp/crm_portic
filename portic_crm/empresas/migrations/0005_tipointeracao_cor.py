from django.db import migrations, models


def seed_cores_tipos_interacao(apps, schema_editor):
    TipoInteracao = apps.get_model("empresas", "TipoInteracao")
    cores = {
        "EVENTO": "#3B82F6",
        "PEDIDO_PORTIC": "#1E3A5F",
        "PEDIDO_EMPRESA": "#10B981",
        "TAREFA_PROJETO": "#8B5CF6",
    }
    for codigo, cor in cores.items():
        TipoInteracao.objects.filter(codigo=codigo).update(cor=cor)


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0004_tipointeracao_tarefa_projeto"),
    ]

    operations = [
        migrations.AddField(
            model_name="tipointeracao",
            name="cor",
            field=models.CharField(default="#6B7280", max_length=7),
        ),
        migrations.RunPython(seed_cores_tipos_interacao, migrations.RunPython.noop),
    ]
