from django.conf import settings
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from portic_crm.administrador.models import PerfilUtilizador


@receiver(post_save, sender=User)
def criar_perfil_utilizador(sender, instance, created, **kwargs):
    if created:
        PerfilUtilizador.objects.get_or_create(user=instance)
