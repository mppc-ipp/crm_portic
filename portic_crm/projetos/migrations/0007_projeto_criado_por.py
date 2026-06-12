# Generated manually

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def preencher_criado_por(apps, schema_editor):
    Projeto = apps.get_model("projetos", "Projeto")
    AtividadeProjeto = apps.get_model("projetos", "AtividadeProjeto")
    for projeto in Projeto.objects.filter(criado_por__isnull=True):
        if projeto.responsavel_id:
            projeto.criado_por_id = projeto.responsavel_id
            projeto.save(update_fields=["criado_por_id"])
            continue
        atividade = (
            AtividadeProjeto.objects.filter(
                projeto_id=projeto.pk,
                acao="PROJETO_CRIADO",
                utilizador__isnull=False,
            )
            .order_by("created_at")
            .first()
        )
        if atividade:
            projeto.criado_por_id = atividade.utilizador_id
            projeto.save(update_fields=["criado_por_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0006_remove_notificacao"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="criado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projetos_criados",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(preencher_criado_por, migrations.RunPython.noop),
    ]
