from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0003_tipointeracao"),
        ("projetos", "0008_projeto_arquivado"),
    ]

    operations = [
        migrations.AddField(
            model_name="objetivo",
            name="empresa",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tarefas",
                to="empresas.empresa",
            ),
        ),
    ]
