from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from portic_crm.core.choices import TipoHistorico


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class HistoricoEntrada(TimeStampedModel):
    """Histórico reutilizável associável a qualquer entidade via GFK."""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    tipo = models.CharField(
        max_length=20,
        choices=TipoHistorico.choices,
        default=TipoHistorico.TEXTO_LIVRE,
    )
    data = models.DateField(null=True, blank=True)
    conteudo = models.TextField()
    registado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos_registados",
    )

    class Meta:
        ordering = ["-data", "-created_at"]
        verbose_name = "entrada de histórico"
        verbose_name_plural = "entradas de histórico"

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.data}"
