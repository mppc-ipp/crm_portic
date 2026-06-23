from django.db import models

from portic_crm.core.models import TimeStampedModel


class EstadoViatura(models.TextChoices):
    ATIVO = "ATIVO", "Ativo"
    INATIVO = "INATIVO", "Inativo"
    MANUTENCAO = "MANUTENCAO", "Em manutenção"


class Viatura(TimeStampedModel):
    matricula = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=80, blank=True, default="")
    modelo = models.CharField(max_length=80, blank=True, default="")
    cor = models.CharField(max_length=40, blank=True, default="")
    ano = models.PositiveIntegerField(null=True, blank=True)
    dono = models.CharField(max_length=120, blank=True, default="")
    telemovel = models.CharField(max_length=30, blank=True, default="")
    sala = models.CharField(max_length=120, blank=True, default="")
    foto = models.ImageField(upload_to="viaturas/", blank=True, null=True)
    descricao = models.TextField(blank=True, default="")
    observacoes = models.TextField(blank=True, default="")
    estado = models.CharField(
        max_length=20,
        choices=EstadoViatura.choices,
        default=EstadoViatura.ATIVO,
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["matricula"]
        verbose_name = "viatura"
        verbose_name_plural = "viaturas"
        permissions = []

    def __str__(self):
        partes = [p for p in (self.marca, self.modelo, self.matricula) if p]
        return " ".join(partes) if partes else self.matricula
