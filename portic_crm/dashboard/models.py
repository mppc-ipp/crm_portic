from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from portic_crm.core.models import TimeStampedModel


class TipoEvento(TimeStampedModel):
    codigo = models.CharField(max_length=40, unique=True)
    nome = models.CharField(max_length=120)
    cor = models.CharField(max_length=7, default="#3B82F6")
    ordem = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "tipo de evento"
        verbose_name_plural = "tipos de evento"

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


class Evento(TimeStampedModel):
    titulo = models.CharField(max_length=255)
    tipo = models.ForeignKey(TipoEvento, on_delete=models.PROTECT, related_name="eventos")
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    descricao = models.TextField(blank=True)
    particular = models.BooleanField(
        default=False,
        help_text="Se activo, o evento só é visível para quem o criou.",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos",
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_criados",
    )

    class Meta:
        ordering = ["data_inicio"]
        permissions = [
            ("view_dashboard", "Ver dashboard"),
            ("gerir_eventos", "Gerir eventos"),
        ]

    def __str__(self):
        return self.titulo

    @classmethod
    def filtrar_visiveis_para(cls, qs, user):
        if user and user.is_authenticated:
            return qs.filter(Q(particular=False) | Q(criado_por=user))
        return qs.filter(particular=False)

    @classmethod
    def visiveis_no_dashboard(cls, user=None):
        """Eventos activos ou que terminaram ontem (visíveis até ao dia seguinte ao fim)."""
        limite = timezone.localdate() - timedelta(days=1)
        qs = cls.objects.filter(data_fim__date__gte=limite).select_related("tipo").order_by("data_inicio")
        return cls.filtrar_visiveis_para(qs, user)

    @classmethod
    def proximos_eventos(cls, user=None):
        """Eventos futuros ou em curso (ainda não terminados)."""
        agora = timezone.now()
        qs = cls.objects.filter(data_fim__gte=agora).select_related("tipo").order_by("data_inicio")
        return cls.filtrar_visiveis_para(qs, user)


class AnexoEvento(TimeStampedModel):
    evento = models.ForeignKey(Evento, on_delete=models.CASCADE, related_name="anexos")
    ficheiro = models.FileField(upload_to="dashboard/eventos/%Y/%m/")
    nome_original = models.CharField(max_length=255)
    tamanho = models.PositiveIntegerField()
    tipo_mime = models.CharField(max_length=100, blank=True)
    carregado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anexos_evento",
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.nome_original
