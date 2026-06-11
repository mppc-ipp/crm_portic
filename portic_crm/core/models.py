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

    tipo = models.CharField(max_length=40, default=TipoHistorico.TEXTO_LIVRE)
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


class TipoNotificacao(models.TextChoices):
    CANDIDATURA_NOVA = "CANDIDATURA_NOVA", "Nova candidatura"
    CANDIDATURA_ESTADO = "CANDIDATURA_ESTADO", "Estado de candidatura"
    CONTRATO_EXPIRAR = "CONTRATO_EXPIRAR", "Contrato a expirar"
    RESERVA_PENDENTE = "RESERVA_PENDENTE", "Reserva pendente"
    TAREFA_PRAZO = "TAREFA_PRAZO", "Tarefa com prazo"
    EVENTO_PROXIMO = "EVENTO_PROXIMO", "Evento próximo"
    SISTEMA = "SISTEMA", "Sistema"


class Notificacao(TimeStampedModel):
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificacoes",
    )
    tipo = models.CharField(max_length=40, choices=TipoNotificacao.choices)
    titulo = models.CharField(max_length=255)
    mensagem = models.TextField(blank=True)
    url = models.CharField(max_length=500, blank=True)
    lida = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "notificação"
        verbose_name_plural = "notificações"
        indexes = [
            models.Index(fields=["utilizador", "lida", "-created_at"]),
        ]

    def __str__(self):
        return self.titulo
