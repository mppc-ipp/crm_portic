import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.utils.text import slugify

from portic_crm.core.models import HistoricoEntrada, TimeStampedModel


class EstadoResidencia(models.TextChoices):
    CANDIDATA = "CANDIDATA", "Candidata"
    INCUBADA = "INCUBADA", "Incubada"
    SAIDA = "SAIDA", "Saída"


class TipoCampoFormulario(models.TextChoices):
    TEXT = "TEXT", "Texto"
    EMAIL = "EMAIL", "Email"
    NUMBER = "NUMBER", "Número"
    CHOICE = "CHOICE", "Escolha"
    TEXTAREA = "TEXTAREA", "Texto longo"


class Edicao(TimeStampedModel):
    ano = models.PositiveIntegerField(unique=True)
    nome = models.CharField(max_length=255)
    ativa = models.BooleanField(default=True)

    class Meta:
        ordering = ["-ano"]
        verbose_name = "edição"
        verbose_name_plural = "edições"

    def __str__(self):
        return f"{self.nome} ({self.ano})"


class Startup(TimeStampedModel):
    nome = models.CharField(max_length=255)
    edicao = models.ForeignKey(
        Edicao,
        on_delete=models.PROTECT,
        related_name="startups",
    )
    estado_residencia = models.CharField(
        max_length=20,
        choices=EstadoResidencia.choices,
        default=EstadoResidencia.CANDIDATA,
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="startups",
    )
    email_contacto = models.EmailField(blank=True)
    telefone_contacto = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ["nome"]
        permissions = [
            ("gerir_formularios_candidatura", "Gerir formulários de candidatura"),
            ("ver_candidaturas", "Ver candidaturas"),
            ("alterar_estado_candidatura", "Alterar estado da candidatura"),
            ("classificar_candidatura", "Classificar candidatura"),
        ]

    def __str__(self):
        return self.nome


class TipoHistoricoCandidatura(TimeStampedModel):
    codigo = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=120)
    ordem = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "tipo de histórico de candidatura"
        verbose_name_plural = "tipos de histórico de candidatura"

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

    @classmethod
    def nome_por_codigo(cls, codigo: str) -> str | None:
        tipo = cls.objects.filter(codigo=codigo).first()
        return tipo.nome if tipo else None


class StatusCandidatura(TimeStampedModel):
    codigo = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=120)
    cor = models.CharField(max_length=7, default="#6B7280")
    ordem = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "estado de candidatura"
        verbose_name_plural = "estados de candidatura"

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


class FormularioCandidatura(TimeStampedModel):
    edicao = models.ForeignKey(
        Edicao,
        on_delete=models.CASCADE,
        related_name="formularios",
    )
    titulo = models.CharField(max_length=255)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    ativo = models.BooleanField(default=True)
    aberto_em = models.DateTimeField(null=True, blank=True)
    fechado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "formulário de candidatura"
        verbose_name_plural = "formulários de candidatura"

    def __str__(self):
        return f"{self.titulo} ({self.edicao.ano})"


class CampoFormulario(models.Model):
    formulario = models.ForeignKey(
        FormularioCandidatura,
        on_delete=models.CASCADE,
        related_name="campos",
    )
    ordem = models.PositiveIntegerField(default=0)
    nome = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TipoCampoFormulario.choices)
    obrigatorio = models.BooleanField(default=True)
    opcoes = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de opções para campos do tipo CHOICE.",
    )

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "campo do formulário"
        verbose_name_plural = "campos do formulário"

    def __str__(self):
        return self.nome


class Candidatura(TimeStampedModel):
    formulario = models.ForeignKey(
        FormularioCandidatura,
        on_delete=models.PROTECT,
        related_name="candidaturas",
    )
    estado = models.CharField(max_length=40, default="SUBMETIDA")
    submetida_em = models.DateTimeField(auto_now_add=True)
    nome_startup = models.CharField(max_length=255, blank=True)
    email_contacto = models.EmailField(blank=True)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidaturas",
    )

    historicos = GenericRelation(HistoricoEntrada)

    class Meta:
        ordering = ["-submetida_em"]
        verbose_name = "candidatura"
        verbose_name_plural = "candidaturas"

    def __str__(self):
        nome_estado = StatusCandidatura.nome_por_codigo(self.estado) or self.estado
        primeira = self.respostas.order_by("campo__ordem").first()
        if primeira and primeira.valor.strip():
            rotulo = primeira.valor.strip()[:80]
        elif self.nome_startup:
            rotulo = self.nome_startup
        else:
            rotulo = self.submetida_em.strftime("Candidatura · %d/%m/%Y %H:%M")
        return f"{rotulo} — {nome_estado}"


class RespostaCampo(models.Model):
    candidatura = models.ForeignKey(
        Candidatura,
        on_delete=models.CASCADE,
        related_name="respostas",
    )
    campo = models.ForeignKey(
        CampoFormulario,
        on_delete=models.CASCADE,
        related_name="respostas",
    )
    valor = models.TextField()

    class Meta:
        unique_together = [("candidatura", "campo")]
        verbose_name = "resposta"
        verbose_name_plural = "respostas"

    def __str__(self):
        return f"{self.campo.nome}: {self.valor[:50]}"


class ClassificacaoCandidatura(TimeStampedModel):
    candidatura = models.OneToOneField(
        Candidatura,
        on_delete=models.CASCADE,
        related_name="classificacao",
    )
    pontuacao = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    classificacao = models.PositiveIntegerField(null=True, blank=True)
    notas = models.TextField(blank=True)
    avaliado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "classificação"
        verbose_name_plural = "classificações"

    def __str__(self):
        return f"Classificação — {self.candidatura.nome_startup}"


class ContratoResidencia(TimeStampedModel):
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name="contratos",
    )
    data_inicio = models.DateField()
    data_fim = models.DateField()
    ativo = models.BooleanField(default=True)
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ["-data_fim"]
        verbose_name = "contrato de residência"
        verbose_name_plural = "contratos de residência"

    def __str__(self):
        return f"Contrato {self.startup.nome} até {self.data_fim}"
