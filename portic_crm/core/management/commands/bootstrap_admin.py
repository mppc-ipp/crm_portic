import os

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from portic_crm.administrador.models import PerfilUtilizador


class Command(BaseCommand):
    help = "Cria ou atualiza o utilizador administrador inicial e garante grupos."

    def handle(self, *args, **options):
        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@admin.com").strip().lower()
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "admin123")

        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if not user:
            user = User(
                username=email,
                email=email,
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
        else:
            user.username = email
            user.email = email
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True

        user.set_password(password)
        user.save()

        PerfilUtilizador.objects.get_or_create(user=user)

        grupo, _ = Group.objects.get_or_create(name=settings.GRUPO_ADMIN_GERAL)
        user.groups.add(grupo)

        verb = "Criado" if created else "Atualizado"
        self.stdout.write(
            self.style.SUCCESS(f"{verb} utilizador '{email}' (AdministradorGeral).")
        )
