from django.conf import settings
from django.db import migrations


def setup_grupos(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    admin_geral, _ = Group.objects.get_or_create(name=settings.GRUPO_ADMIN_GERAL)
    admin_parcial, _ = Group.objects.get_or_create(name=settings.GRUPO_ADMIN_PARCIAL)
    utilizador_comum, _ = Group.objects.get_or_create(name=settings.GRUPO_UTILIZADOR_COMUM)

    # Administrador geral: todas as permissões
    todas = Permission.objects.all()
    admin_geral.permissions.set(todas)

    # Utilizador comum: apenas espaços (consulta e pedidos)
    codenames_comum = [
        "view_sala",
        "view_viatura",
        "view_pedidoreserva",
        "add_pedidoreserva",
        "view_unidade",
    ]
    perms_comum = Permission.objects.filter(
        content_type__app_label="espacos",
        codename__in=codenames_comum,
    )
    utilizador_comum.permissions.set(perms_comum)

    # Administrador parcial: sem permissões por defeito (atribuição manual)


def reverse_grupos(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(
        name__in=[
            settings.GRUPO_ADMIN_GERAL,
            settings.GRUPO_ADMIN_PARCIAL,
            settings.GRUPO_UTILIZADOR_COMUM,
        ]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("administrador", "0001_initial"),
        ("empresas", "0001_initial"),
        ("startups", "0001_initial"),
        ("projetos", "0001_initial"),
        ("espacos", "0001_initial"),
        ("dashboard", "0001_initial"),
        ("core", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(setup_grupos, reverse_grupos),
    ]
