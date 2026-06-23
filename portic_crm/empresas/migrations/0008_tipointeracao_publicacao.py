from django.db import migrations


def seed_publicacao(apps, schema_editor):
    TipoInteracao = apps.get_model("empresas", "TipoInteracao")
    TipoInteracao.objects.get_or_create(
        codigo="PUBLICACAO",
        defaults={
            "nome": "Publicação",
            "ordem": 5,
            "ativo": True,
            "cor": "#EC4899",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0007_tipoparceria_configuravel"),
    ]

    operations = [
        migrations.RunPython(seed_publicacao, migrations.RunPython.noop),
    ]
