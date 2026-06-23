from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0005_tipointeracao_cor"),
        ("marketing", "0004_corestadopublicacao"),
    ]

    operations = [
        migrations.AddField(
            model_name="publicacao",
            name="empresas",
            field=models.ManyToManyField(
                blank=True,
                related_name="publicacoes_marketing",
                to="empresas.empresa",
            ),
        ),
    ]
