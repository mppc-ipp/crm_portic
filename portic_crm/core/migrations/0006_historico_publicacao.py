import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_evento_empresa_interacao"),
        ("marketing", "0005_publicacao_empresas"),
    ]

    operations = [
        migrations.AddField(
            model_name="historicoentrada",
            name="publicacao",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="interacoes_empresa",
                to="marketing.publicacao",
            ),
        ),
    ]
