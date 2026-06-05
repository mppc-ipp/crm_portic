from django.contrib.contenttypes.fields import GenericRelation
from django.db import models

from portic_crm.core.models import HistoricoEntrada, TimeStampedModel


class TipoEmpresa(models.TextChoices):
    CLIENTE = "CLIENTE", "Cliente"
    PARCEIRO = "PARCEIRO", "Parceiro"
    FORNECEDOR = "FORNECEDOR", "Fornecedor"
    ASSOCIADO = "ASSOCIADO", "Associado"


class EstadoEmpresa(models.TextChoices):
    ATIVO = "ATIVO", "Ativo"
    INATIVO = "INATIVO", "Inativo"
    PROSPETO = "PROSPETO", "Prospeto / Lead"
    SUSPENSO = "SUSPENSO", "Suspenso"
    STARTUP = "STARTUP", "StartUp"
    PARCEIRA = "PARCEIRA", "Parceira"


class Empresa(TimeStampedModel):
    nome = models.CharField(max_length=255)
    nif = models.CharField(max_length=20, unique=True)
    cae = models.CharField("CAE", max_length=10, blank=True)
    setor = models.CharField(max_length=120, blank=True)
    tipo = models.CharField(max_length=20, choices=TipoEmpresa.choices)
    estado = models.CharField(
        max_length=20,
        choices=EstadoEmpresa.choices,
        default=EstadoEmpresa.ATIVO,
    )
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=40, blank=True)
    morada = models.CharField("Morada", max_length=255, blank=True)
    codigo_postal = models.CharField("Código postal", max_length=8, blank=True)
    localidade = models.CharField(max_length=120, blank=True)
    concelho = models.CharField(max_length=120, blank=True)
    distrito = models.CharField(max_length=120, blank=True)

    historicos = GenericRelation(HistoricoEntrada)

    class Meta:
        ordering = ["nome"]
        permissions = []

    def __str__(self):
        return self.nome


class Contacto(TimeStampedModel):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name="contactos",
    )
    nome = models.CharField(max_length=255)
    cargo = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "contacto"
        verbose_name_plural = "contactos"

    def __str__(self):
        return f"{self.nome} ({self.empresa.nome})"
