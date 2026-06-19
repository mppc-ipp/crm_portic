from django.conf import settings
from django.db import migrations


def setup_grupo_gestor_teletrabalho(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    gestor, _ = Group.objects.get_or_create(name=settings.GRUPO_GESTOR)

    perms_gestor = Permission.objects.filter(
        content_type__app_label="teletrabalho",
        codename__in=["view_teletrabalho", "gerir_teletrabalho"],
    )
    gestor.permissions.add(*perms_gestor)

    try:
        utilizador_comum = Group.objects.get(name=settings.GRUPO_UTILIZADOR_COMUM)
    except Group.DoesNotExist:
        utilizador_comum = None

    perm_view = Permission.objects.filter(
        content_type__app_label="teletrabalho",
        codename="view_teletrabalho",
    ).first()
    if utilizador_comum and perm_view:
        utilizador_comum.permissions.add(perm_view)

    try:
        admin_geral = Group.objects.get(name=settings.GRUPO_ADMIN_GERAL)
        admin_geral.permissions.add(*perms_gestor)
    except Group.DoesNotExist:
        pass


def reverse_setup(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name=settings.GRUPO_GESTOR).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("teletrabalho", "0001_initial"),
        ("administrador", "0005_configuracao_marketing"),
    ]

    operations = [
        migrations.RunPython(setup_grupo_gestor_teletrabalho, reverse_setup),
    ]
