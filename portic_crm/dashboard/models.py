from django.db import models

from portic_crm.core.models import TimeStampedModel


class TipoEvento(models.TextChoices):
    WORKSHOP = "WORKSHOP", "Workshop"
    DEMO_DAY = "DEMO_DAY", "Demo Day"
    COMPETICAO = "COMPETICAO", "Competição"
    OUTRO = "OUTRO", "Outro"


class Evento(TimeStampedModel):
    titulo = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TipoEvento.choices)
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    descricao = models.TextField(blank=True)
    edicao = models.ForeignKey(
        "startups.Edicao",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos",
    )

    class Meta:
        ordering = ["data_inicio"]
        permissions = [
            ("view_dashboard", "Ver dashboard"),
            ("gerir_eventos", "Gerir eventos"),
        ]

    def __str__(self):
        return self.titulo
