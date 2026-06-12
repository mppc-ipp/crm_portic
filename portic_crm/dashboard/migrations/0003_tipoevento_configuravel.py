from django.db import migrations, models
import django.db.models.deletion


def seed_tipos_evento(apps, schema_editor):
    TipoEvento = apps.get_model("dashboard", "TipoEvento")
    defaults = [
        ("WORKSHOP", "Workshop", "#8B5CF6", 1),
        ("DEMO_DAY", "Demo Day", "#10B981", 2),
        ("COMPETICAO", "Competição", "#F59E0B", 3),
        ("OUTRO", "Outro", "#0EA5E9", 4),
    ]
    for codigo, nome, cor, ordem in defaults:
        TipoEvento.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "cor": cor, "ordem": ordem, "ativo": True},
        )


def vincular_eventos_a_tipos(apps, schema_editor):
    Evento = apps.get_model("dashboard", "Evento")
    TipoEvento = apps.get_model("dashboard", "TipoEvento")
    fallback = TipoEvento.objects.filter(codigo="OUTRO").first()
    for evento in Evento.objects.all():
        codigo = evento.tipo_legacy
        tipo = TipoEvento.objects.filter(codigo=codigo).first() or fallback
        if tipo:
            evento.tipo_novo_id = tipo.pk
            evento.save(update_fields=["tipo_novo_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0002_anexoevento"),
    ]

    operations = [
        migrations.CreateModel(
            name="TipoEvento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("codigo", models.CharField(max_length=40, unique=True)),
                ("nome", models.CharField(max_length=120)),
                ("cor", models.CharField(default="#3B82F6", max_length=7)),
                ("ordem", models.PositiveIntegerField(default=0)),
                ("ativo", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "tipo de evento",
                "verbose_name_plural": "tipos de evento",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.RunPython(seed_tipos_evento, migrations.RunPython.noop),
        migrations.RenameField(
            model_name="evento",
            old_name="tipo",
            new_name="tipo_legacy",
        ),
        migrations.AddField(
            model_name="evento",
            name="tipo_novo",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="dashboard.tipoevento",
            ),
        ),
        migrations.RunPython(vincular_eventos_a_tipos, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="evento",
            name="tipo_legacy",
        ),
        migrations.RemoveField(
            model_name="evento",
            name="edicao",
        ),
        migrations.RenameField(
            model_name="evento",
            old_name="tipo_novo",
            new_name="tipo",
        ),
        migrations.AlterField(
            model_name="evento",
            name="tipo",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="eventos",
                to="dashboard.tipoevento",
            ),
        ),
    ]
