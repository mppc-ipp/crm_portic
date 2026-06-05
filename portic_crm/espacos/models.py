from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from portic_crm.core.models import TimeStampedModel


class ModuloEspaco(models.TextChoices):
    SALA = "SALA", "Salas"
    VIATURA = "VIATURA", "Viaturas"


class VisibilidadeRecurso(models.TextChoices):
    PUBLICO_GERAL = "PUBLICO_GERAL", "Público geral"
    COMUNIDADE_ACADEMICA = "COMUNIDADE_ACADEMICA", "Comunidade académica"


class StatusRecurso(models.TextChoices):
    DISPONIVEL = "DISPONIVEL", "Disponível"
    MANUTENCAO = "MANUTENCAO", "Manutenção"
    INDISPONIVEL = "INDISPONIVEL", "Indisponível"


class StatusPedidoReserva(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"
    CANCELADO = "CANCELADO", "Cancelado"


class StatusOcorrenciaReserva(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    APROVADA = "APROVADA", "Aprovada"
    REJEITADA = "REJEITADA", "Rejeitada"
    CANCELADA = "CANCELADA", "Cancelada"


class AcaoTokenReserva(models.TextChoices):
    APROVAR = "APROVAR", "Aprovar"
    REJEITAR = "REJEITAR", "Rejeitar"


class Unidade(TimeStampedModel):
    nome = models.CharField(max_length=255)
    cor_r = models.PositiveSmallIntegerField(default=0)
    cor_g = models.PositiveSmallIntegerField(default=0)
    cor_b = models.PositiveSmallIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "unidade"
        verbose_name_plural = "unidades"

    def __str__(self):
        return self.nome


class PerfilUnidadeEspacos(models.Model):
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfis_unidade_espacos",
    )
    unidade = models.ForeignKey(
        Unidade,
        on_delete=models.CASCADE,
        related_name="perfis_admin",
    )
    admin_salas = models.BooleanField(default=True)
    admin_viaturas = models.BooleanField(default=False)

    class Meta:
        unique_together = [("utilizador", "unidade")]
        verbose_name = "perfil de unidade (espaços)"
        verbose_name_plural = "perfis de unidade (espaços)"

    def __str__(self):
        return f"{self.utilizador} — {self.unidade}"


class Localizacao(TimeStampedModel):
    unidade = models.ForeignKey(
        Unidade,
        on_delete=models.CASCADE,
        related_name="localizacoes",
    )
    nome = models.CharField(max_length=255)
    modulo = models.CharField(max_length=10, choices=ModuloEspaco.choices)
    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("unidade", "nome", "modulo")]
        ordering = ["nome"]
        verbose_name = "localização"
        verbose_name_plural = "localizações"

    def __str__(self):
        return self.nome


class Sala(TimeStampedModel):
    unidade = models.ForeignKey(
        Unidade,
        on_delete=models.PROTECT,
        related_name="salas",
    )
    nome = models.CharField(max_length=255)
    capacidade = models.PositiveIntegerField()
    foto = models.ImageField(upload_to="espacos/salas/", blank=True, null=True)
    descricao = models.TextField()
    localizacao = models.CharField(max_length=255)
    recursos = models.JSONField(default=list, blank=True)
    mobilidade_reduzida = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=StatusRecurso.choices,
        default=StatusRecurso.DISPONIVEL,
    )
    visibilidade = models.CharField(
        max_length=30,
        choices=VisibilidadeRecurso.choices,
        default=VisibilidadeRecurso.COMUNIDADE_ACADEMICA,
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]
        permissions = [
            ("aprovar_reserva", "Aprovar reservas"),
            ("gerir_recursos", "Gerir recursos (salas e viaturas)"),
            ("ver_auditoria_espacos", "Ver auditoria de espaços"),
            ("admin_unidade_espacos", "Administrar unidade (espaços)"),
        ]

    def __str__(self):
        return self.nome


class Viatura(TimeStampedModel):
    unidade = models.ForeignKey(
        Unidade,
        on_delete=models.PROTECT,
        related_name="viaturas",
    )
    nome = models.CharField(max_length=255)
    matricula = models.CharField(max_length=20)
    marca = models.CharField(max_length=80, blank=True)
    modelo = models.CharField(max_length=80, blank=True)
    cor = models.CharField(max_length=40, blank=True)
    capacidade = models.PositiveIntegerField()
    foto = models.ImageField(upload_to="espacos/viaturas/", blank=True, null=True)
    descricao = models.TextField(blank=True, default="")
    localizacao = models.CharField(max_length=255)
    recursos = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusRecurso.choices,
        default=StatusRecurso.DISPONIVEL,
    )
    visibilidade = models.CharField(
        max_length=30,
        choices=VisibilidadeRecurso.choices,
        default=VisibilidadeRecurso.COMUNIDADE_ACADEMICA,
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("unidade", "matricula")]
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.matricula})"


class PedidoReserva(TimeStampedModel):
    modulo = models.CharField(max_length=10, choices=ModuloEspaco.choices)
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="pedidos_reserva",
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="pedidos_reserva_criados",
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField()
    numero_pessoas = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=StatusPedidoReserva.choices,
        default=StatusPedidoReserva.PENDENTE,
    )
    observacao_admin = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "pedido de reserva"
        verbose_name_plural = "pedidos de reserva"

    def __str__(self):
        return f"{self.titulo} ({self.get_status_display()})"


class OcorrenciaReserva(TimeStampedModel):
    pedido = models.ForeignKey(
        PedidoReserva,
        on_delete=models.CASCADE,
        related_name="ocorrencias",
    )
    sala = models.ForeignKey(
        Sala,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ocorrencias",
    )
    viatura = models.ForeignKey(
        Viatura,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ocorrencias",
    )
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=StatusOcorrenciaReserva.choices,
        default=StatusOcorrenciaReserva.PENDENTE,
    )

    class Meta:
        ordering = ["data_inicio"]
        verbose_name = "ocorrência de reserva"
        verbose_name_plural = "ocorrências de reserva"
        indexes = [
            models.Index(fields=["sala", "data_inicio", "data_fim"]),
            models.Index(fields=["viatura", "data_inicio", "data_fim"]),
            models.Index(fields=["status", "sala"]),
            models.Index(fields=["status", "viatura"]),
        ]

    def clean(self):
        has_sala = self.sala_id is not None
        has_viatura = self.viatura_id is not None
        if has_sala == has_viatura:
            raise ValidationError(
                "Cada ocorrência deve ter exatamente uma sala ou uma viatura."
            )
        if self.data_fim <= self.data_inicio:
            raise ValidationError("A data de fim deve ser posterior à data de início.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        recurso = self.sala or self.viatura
        return f"{recurso} — {self.data_inicio}"


class HistoricoReserva(models.Model):
    pedido = models.ForeignKey(
        PedidoReserva,
        on_delete=models.CASCADE,
        related_name="historicos",
    )
    ocorrencia = models.ForeignKey(
        OcorrenciaReserva,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos",
    )
    utilizador_acao = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="historicos_reserva_acoes",
    )
    acao = models.CharField(max_length=80)
    descricao = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "histórico de reserva"
        verbose_name_plural = "históricos de reserva"

    def __str__(self):
        return f"{self.acao} — {self.pedido_id}"


class TokenReserva(models.Model):
    pedido = models.ForeignKey(
        PedidoReserva,
        on_delete=models.CASCADE,
        related_name="tokens",
    )
    token = models.CharField(max_length=64, unique=True)
    acao = models.CharField(max_length=10, choices=AcaoTokenReserva.choices)
    usado = models.BooleanField(default=False)
    expira_em = models.DateTimeField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["pedido", "acao", "usado"]),
        ]

    def __str__(self):
        return f"{self.acao} — {self.pedido_id}"


class ConfiguracaoModulos(models.Model):
    """Singleton de configuração global dos módulos de espaços."""

    id = models.CharField(primary_key=True, max_length=20, default="default", editable=False)
    modulo_salas_ativo = models.BooleanField(default=True)
    modulo_viaturas_ativo = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "configuração de módulos"
        verbose_name_plural = "configuração de módulos"

    def save(self, *args, **kwargs):
        self.id = "default"
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(id="default")
        return obj

    def __str__(self):
        return "Configuração de módulos"


class AuditoriaEspacos(models.Model):
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias_espacos",
    )
    unidade = models.ForeignKey(
        Unidade,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias",
    )
    modulo = models.CharField(
        max_length=10,
        choices=ModuloEspaco.choices,
        null=True,
        blank=True,
    )
    acao = models.CharField(max_length=80)
    entidade = models.CharField(max_length=80)
    entidade_id = models.CharField(max_length=64, blank=True)
    descricao = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "auditoria (espaços)"
        verbose_name_plural = "auditorias (espaços)"
        permissions = []

    def __str__(self):
        return f"{self.acao} — {self.entidade}"
