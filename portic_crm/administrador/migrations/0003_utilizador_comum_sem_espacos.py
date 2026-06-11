from django.conf import settings
from django.db import migrations


def limpar_permissoes_espacos(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    try:
        grupo = Group.objects.get(name=settings.GRUPO_UTILIZADOR_COMUM)
    except Group.DoesNotExist:
        return
    perms_espacos = Permission.objects.filter(content_type__app_label="espacos")
    grupo.permissions.remove(*perms_espacos)


def reverse_limpar(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    try:
        grupo = Group.objects.get(name=settings.GRUPO_UTILIZADOR_COMUM)
    except Group.DoesNotExist:
        return
    codenames_comum = [
        "view_sala",
        "view_viatura",
        "view_pedidoreserva",
        "add_pedidoreserva",
        "view_unidade",
    ]
    perms = Permission.objects.filter(
        content_type__app_label="espacos",
        codename__in=codenames_comum,
    )
    grupo.permissions.add(*perms)


class Migration(migrations.Migration):
    dependencies = [
        ("administrador", "0002_setup_grupos"),
    ]

    operations = [
        migrations.RunPython(limpar_permissoes_espacos, reverse_limpar),
    ]
