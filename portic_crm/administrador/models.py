from django.conf import settings
from django.db import models


class PerfilUtilizador(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
    )
    telemovel = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = "perfil de utilizador"
        verbose_name_plural = "perfis de utilizador"
        permissions = [
            ("gerir_utilizadores", "Gerir utilizadores e permissões"),
        ]

    def __str__(self):
        return f"Perfil — {self.user.username}"
