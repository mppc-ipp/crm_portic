from django.db import migrations, models


def criar_tipos_parceria(apps, schema_editor):
    TipoParceria = apps.get_model("empresas", "TipoParceria")
    tipos = [
        ("ACADEMICA", "Académica", 1),
        ("EMPRESARIAL", "Empresarial", 2),
        ("SOCIEDADE_CIVIL", "Sociedade Civil", 3),
    ]
    for codigo, nome, ordem in tipos:
        TipoParceria.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "ordem": ordem, "ativo": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0006_empresa_tipo_parceria"),
    ]

    operations = [
        migrations.CreateModel(
            name="TipoParceria",
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
                "verbose_name": "tipo de parceria",
                "verbose_name_plural": "tipos de parceria",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.AlterField(
            model_name="empresa",
            name="tipo_parceria",
            field=models.CharField(blank=True, max_length=40, verbose_name="Tipo de parceria"),
        ),
        migrations.RunPython(criar_tipos_parceria, migrations.RunPython.noop),
    ]
