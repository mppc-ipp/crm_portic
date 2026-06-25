from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from portic_crm.core.models import TimeStampedModel


class TipoEventoSeguranca(TimeStampedModel):
    codigo = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=120)
    cor = models.CharField(max_length=7, default="#3B82F6")
    ordem = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "tipo de evento de segurança"
        verbose_name_plural = "tipos de evento de segurança"

    def __str__(self):
        return self.nome

    @classmethod
    def gerar_codigo(cls, nome: str, excluir_pk=None) -> str:
        base = slugify(nome).upper().replace("-", "_") or "TIPO"
        codigo = base[:40]
        qs = cls.objects.filter(codigo=codigo)
        if excluir_pk:
            qs = qs.exclude(pk=excluir_pk)
        if not qs.exists():
            return codigo
        n = 2
        while True:
            suffix = f"_{n}"
            candidato = f"{base[: 40 - len(suffix)]}{suffix}"
            qs = cls.objects.filter(codigo=candidato)
            if excluir_pk:
                qs = qs.exclude(pk=excluir_pk)
            if not qs.exists():
                return candidato
            n += 1


class TipoOcorrencia(TimeStampedModel):
    codigo = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=120)
    cor = models.CharField(max_length=7, default="#6B7280")
    ordem = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "tipo de ocorrência"
        verbose_name_plural = "tipos de ocorrência"

    def __str__(self):
        return self.nome

    @classmethod
    def gerar_codigo(cls, nome: str, excluir_pk=None) -> str:
        base = slugify(nome).upper().replace("-", "_") or "TIPO"
        codigo = base[:40]
        qs = cls.objects.filter(codigo=codigo)
        if excluir_pk:
            qs = qs.exclude(pk=excluir_pk)
        if not qs.exists():
            return codigo
        n = 2
        while True:
            suffix = f"_{n}"
            candidato = f"{base[: 40 - len(suffix)]}{suffix}"
            qs = cls.objects.filter(codigo=candidato)
            if excluir_pk:
                qs = qs.exclude(pk=excluir_pk)
            if not qs.exists():
                return candidato
            n += 1


class NivelAviso(models.TextChoices):
    INFO = "INFO", "Informação"
    ALERTA = "ALERTA", "Alerta"
    CRITICO = "CRITICO", "Crítico"


class AvisoSeguranca(TimeStampedModel):
    titulo = models.CharField(max_length=255)
    conteudo = models.TextField()
    nivel = models.CharField(max_length=20, choices=NivelAviso.choices, default=NivelAviso.INFO)
    data_inicio = models.DateField(default=timezone.localdate)
    data_fim = models.DateField(null=True, blank=True)
    ativo = models.BooleanField(default=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avisos_seguranca_criados",
    )

    class Meta:
        ordering = ["-data_inicio", "-created_at"]
        verbose_name = "aviso de segurança"
        verbose_name_plural = "avisos de segurança"
        default_permissions = ()
        permissions = [
            ("view_avisoseguranca", "Ver avisos de segurança"),
            ("gerir_avisos", "Gerir avisos de segurança"),
            ("gerir_ocorrencias", "Gerir ocorrências de segurança"),
        ]

    def __str__(self):
        return self.titulo

    @classmethod
    def visiveis_agora(cls):
        hoje = timezone.localdate()
        qs = cls.objects.filter(ativo=True, data_inicio__lte=hoje)
        return qs.filter(models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje))


class EstadoOcorrencia(models.TextChoices):
    """Estados padrão usados como seed inicial de StatusOcorrencia."""

    ABERTA = "ABERTA", "Aberta"
    EM_TRATAMENTO = "EM_TRATAMENTO", "Em tratamento"
    FECHADA = "FECHADA", "Fechada"


class StatusOcorrencia(TimeStampedModel):
    codigo = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=120)
    cor = models.CharField(max_length=7, default="#6B7280")
    ordem = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "estado de ocorrência"
        verbose_name_plural = "estados de ocorrência"

    def __str__(self):
        return self.nome

    @classmethod
    def gerar_codigo(cls, nome: str, excluir_pk=None) -> str:
        base = slugify(nome).upper().replace("-", "_") or "ESTADO"
        codigo = base[:40]
        qs = cls.objects.filter(codigo=codigo)
        if excluir_pk:
            qs = qs.exclude(pk=excluir_pk)
        if not qs.exists():
            return codigo
        n = 2
        while True:
            suffix = f"_{n}"
            candidato = f"{base[: 40 - len(suffix)]}{suffix}"
            qs = cls.objects.filter(codigo=candidato)
            if excluir_pk:
                qs = qs.exclude(pk=excluir_pk)
            if not qs.exists():
                return candidato
            n += 1

    @classmethod
    def nome_por_codigo(cls, codigo: str) -> str | None:
        status = cls.objects.filter(codigo=codigo).first()
        return status.nome if status else None

    @classmethod
    def cor_por_codigo(cls, codigo: str) -> str:
        status = cls.objects.filter(codigo=codigo).first()
        return status.cor if status else "#6B7280"


class OcorrenciaSeguranca(TimeStampedModel):
    titulo = models.CharField(max_length=255)
    descricao = models.TextField()
    tipo = models.ForeignKey(
        TipoOcorrencia,
        on_delete=models.PROTECT,
        related_name="ocorrencias",
        null=True,
        blank=True,
    )
    data_hora = models.DateTimeField()
    local = models.CharField(max_length=255, blank=True, default="")
    estado = models.CharField(max_length=40, default=EstadoOcorrencia.ABERTA)
    observacoes_resolucao = models.TextField(blank=True, default="")
    registado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ocorrencias_seguranca_registadas",
    )

    class Meta:
        ordering = ["-data_hora"]
        verbose_name = "ocorrência de segurança"
        verbose_name_plural = "ocorrências de segurança"

    def __str__(self):
        return self.titulo


class EventoSeguranca(TimeStampedModel):
    titulo = models.CharField(max_length=255)
    tipo = models.ForeignKey(
        TipoEventoSeguranca,
        on_delete=models.PROTECT,
        related_name="eventos",
    )
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    descricao = models.TextField(blank=True, default="")
    local = models.CharField(max_length=255, blank=True, default="")
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_seguranca_criados",
    )

    class Meta:
        ordering = ["data_inicio"]
        verbose_name = "evento de segurança"
        verbose_name_plural = "eventos de segurança"

    def __str__(self):
        return self.titulo

    @classmethod
    def proximos_eventos(cls):
        agora = timezone.now()
        return cls.objects.filter(data_fim__gte=agora).select_related("tipo").order_by("data_inicio")
