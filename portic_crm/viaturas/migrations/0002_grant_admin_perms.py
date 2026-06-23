from django.conf import settings
from django.db import migrations


def grant_perms(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    try:
        grupo = Group.objects.get(name=settings.GRUPO_ADMIN_GERAL)
    except Group.DoesNotExist:
        return
    perms = Permission.objects.filter(
        content_type__app_label__in=["viaturas", "avisos_seguranca"]
    )
    grupo.permissions.add(*perms)


class Migration(migrations.Migration):
    dependencies = [
        ("viaturas", "0001_initial"),
        ("avisos_seguranca", "0001_initial"),
        ("administrador", "0002_setup_grupos"),
    ]

    operations = [
        migrations.RunPython(grant_perms, migrations.RunPython.noop),
    ]
