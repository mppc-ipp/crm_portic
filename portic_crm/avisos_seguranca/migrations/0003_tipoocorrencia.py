from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("avisos_seguranca", "0002_remove_gerir_eventos_permission"),
    ]

    operations = [
        migrations.CreateModel(
            name="TipoOcorrencia",
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
                "verbose_name": "tipo de ocorrência",
                "verbose_name_plural": "tipos de ocorrência",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.AddField(
            model_name="ocorrenciaseguranca",
            name="tipo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="ocorrencias",
                to="avisos_seguranca.tipoocorrencia",
            ),
        ),
    ]
