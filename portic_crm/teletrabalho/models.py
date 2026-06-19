from django.conf import settings
from django.db import models

from portic_crm.core.models import TimeStampedModel


class TipoRegistoTeletrabalho(models.TextChoices):
    ENTRADA_MANHA = "ENTRADA_MANHA", "Entrada manhã"
    SAIDA_MANHA = "SAIDA_MANHA", "Saída manhã"
    ENTRADA_TARDE = "ENTRADA_TARDE", "Entrada tarde"
    SAIDA_TARDE = "SAIDA_TARDE", "Saída tarde"


TIPOS_PERIODO_MANHA = {
    TipoRegistoTeletrabalho.ENTRADA_MANHA,
    TipoRegistoTeletrabalho.SAIDA_MANHA,
}
TIPOS_PERIODO_TARDE = {
    TipoRegistoTeletrabalho.ENTRADA_TARDE,
    TipoRegistoTeletrabalho.SAIDA_TARDE,
}


class RegistroTeletrabalho(TimeStampedModel):
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="registos_teletrabalho",
    )
    tipo = models.CharField(max_length=20, choices=TipoRegistoTeletrabalho.choices)
    observacao = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "registo de teletrabalho"
        verbose_name_plural = "registos de teletrabalho"
        permissions = [
            ("view_teletrabalho", "Ver teletrabalho"),
            ("gerir_teletrabalho", "Gerir registos de teletrabalho"),
        ]

    def __str__(self):
        return f"{self.utilizador} — {self.get_tipo_display()} ({self.created_at})"
