from django.conf import settings
from django.db import models

from portic_crm.core.models import TimeStampedModel


class PlataformaSocial(models.TextChoices):
    FACEBOOK = "FACEBOOK", "Facebook"
    INSTAGRAM = "INSTAGRAM", "Instagram"
    LINKEDIN = "LINKEDIN", "LinkedIn"


class EstadoPublicacao(models.TextChoices):
    RASCUNHO = "RASCUNHO", "Rascunho"
    AGENDADO = "AGENDADO", "Agendado"
    A_PUBLICAR = "A_PUBLICAR", "A publicar"
    PUBLICADO = "PUBLICADO", "Publicado"
    PARCIAL = "PARCIAL", "Parcial"
    FALHOU = "FALHOU", "Falhou"
    CANCELADO = "CANCELADO", "Cancelado"


class EstadoDestino(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    A_PUBLICAR = "A_PUBLICAR", "A publicar"
    PUBLICADO = "PUBLICADO", "Publicado"
    FALHOU = "FALHOU", "Falhou"
    CANCELADO = "CANCELADO", "Cancelado"


class TipoMidia(models.TextChoices):
    IMAGEM = "IMAGEM", "Imagem"
    VIDEO = "VIDEO", "Vídeo"


class NivelLog(models.TextChoices):
    INFO = "INFO", "Info"
    AVISO = "AVISO", "Aviso"
    ERRO = "ERRO", "Erro"


MARKETING_PERMISSIONS = [
    ("view_publicacao", "Ver publicações"),
    ("add_publicacao", "Criar publicações"),
    ("change_publicacao", "Editar publicações"),
    ("delete_publicacao", "Eliminar publicações"),
    ("publicar", "Publicar e agendar"),
    ("gerir_contas", "Ligar contas sociais"),
]


class ContaSocial(TimeStampedModel):
    plataforma = models.CharField(max_length=20, choices=PlataformaSocial.choices)
    nome_exibicao = models.CharField(max_length=255)
    external_id = models.CharField(max_length=255)
    access_token = models.TextField(blank=True)
    token_expira_em = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ativa = models.BooleanField(default=True)
    ligada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contas_sociais_ligadas",
    )

    class Meta:
        ordering = ["plataforma", "nome_exibicao"]
        unique_together = [("plataforma", "external_id")]
        verbose_name = "conta social"
        verbose_name_plural = "contas sociais"

    def __str__(self):
        return f"{self.get_plataforma_display()} — {self.nome_exibicao}"


class Publicacao(TimeStampedModel):
    titulo_interno = models.CharField(max_length=255)
    texto = models.TextField(blank=True)
    link_url = models.URLField(blank=True, max_length=500)
    estado = models.CharField(
        max_length=20,
        choices=EstadoPublicacao.choices,
        default=EstadoPublicacao.RASCUNHO,
    )
    agendado_para = models.DateTimeField(null=True, blank=True)
    publicado_em = models.DateTimeField(null=True, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="publicacoes_marketing",
    )

    class Meta:
        ordering = ["-created_at"]
        default_permissions = ()
        permissions = MARKETING_PERMISSIONS
        verbose_name = "publicação"
        verbose_name_plural = "publicações"

    def __str__(self):
        return self.titulo_interno


class PublicacaoMidia(TimeStampedModel):
    publicacao = models.ForeignKey(
        Publicacao,
        on_delete=models.CASCADE,
        related_name="midias",
    )
    ficheiro = models.FileField(upload_to="marketing/")
    tipo = models.CharField(max_length=10, choices=TipoMidia.choices, default=TipoMidia.IMAGEM)
    ordem = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]

    def __str__(self):
        return f"Mídia {self.ordem} — {self.publicacao_id}"


class PublicacaoDestino(TimeStampedModel):
    publicacao = models.ForeignKey(
        Publicacao,
        on_delete=models.CASCADE,
        related_name="destinos",
    )
    plataforma = models.CharField(max_length=20, choices=PlataformaSocial.choices)
    conta = models.ForeignKey(
        ContaSocial,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="destinos",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoDestino.choices,
        default=EstadoDestino.PENDENTE,
    )
    external_post_id = models.CharField(max_length=255, blank=True)
    erro = models.TextField(blank=True)
    publicado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["plataforma"]
        unique_together = [("publicacao", "plataforma", "conta")]

    def __str__(self):
        return f"{self.publicacao_id} → {self.plataforma}"


class PublicacaoLog(TimeStampedModel):
    publicacao = models.ForeignKey(
        Publicacao,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    nivel = models.CharField(max_length=10, choices=NivelLog.choices, default=NivelLog.INFO)
    mensagem = models.CharField(max_length=500)
    detalhes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.mensagem[:80]
