from django.db import migrations, models


def seed_tipos_interacao(apps, schema_editor):
    TipoInteracao = apps.get_model("empresas", "TipoInteracao")
    tipos = [
        ("EVENTO", "Evento", 1),
        ("PEDIDO_PORTIC", "Pedido Portic", 2),
        ("PEDIDO_EMPRESA", "Pedido Empresa", 3),
    ]
    for codigo, nome, ordem in tipos:
        TipoInteracao.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "ordem": ordem, "ativo": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0002_empresa_cae_morada_estado"),
    ]

    operations = [
        migrations.CreateModel(
            name="TipoInteracao",
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
                "verbose_name": "tipo de interação",
                "verbose_name_plural": "tipos de interação",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.RunPython(seed_tipos_interacao, migrations.RunPython.noop),
    ]
