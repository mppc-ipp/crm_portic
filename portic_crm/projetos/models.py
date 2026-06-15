from django.conf import settings
from django.db import models

from portic_crm.core.models import TimeStampedModel


class EstadoProjeto(models.TextChoices):
    ATIVO = "ATIVO", "Ativo"
    PAUSADO = "PAUSADO", "Pausado"
    CONCLUIDO = "CONCLUIDO", "Concluído"
    CANCELADO = "CANCELADO", "Cancelado"


class EstadoObjetivo(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    EM_PROGRESSO = "EM_PROGRESSO", "Em progresso"
    CONCLUIDO = "CONCLUIDO", "Concluído"
    BLOQUEADO = "BLOQUEADO", "Bloqueado"


class Projeto(TimeStampedModel):
    nome = models.CharField(max_length=255)
    resumo = models.TextField(blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projetos_criados",
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projetos_responsavel",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoProjeto.choices,
        default=EstadoProjeto.ATIVO,
    )
    cor = models.CharField(max_length=7, default="#1e3a5f")
    arquivado = models.BooleanField(default=False)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class MembroProjeto(models.Model):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="membros",
    )
    email = models.EmailField()
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="membros_projeto",
    )

    class Meta:
        unique_together = [("projeto", "email")]
        verbose_name = "membro de projeto"
        verbose_name_plural = "membros de projeto"

    def __str__(self):
        return self.email


class Secao(models.Model):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="secoes",
    )
    nome = models.CharField(max_length=255)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "secção"
        verbose_name_plural = "secções"

    def __str__(self):
        return f"{self.projeto.nome} — {self.nome}"


class Objetivo(TimeStampedModel):
    secao = models.ForeignKey(
        Secao,
        on_delete=models.CASCADE,
        related_name="objetivos",
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_limite = models.DateField(null=True, blank=True)
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="objetivos_responsavel",
    )
    responsavel_email = models.EmailField(blank=True, default="")
    estado = models.CharField(
        max_length=20,
        choices=EstadoObjetivo.choices,
        default=EstadoObjetivo.PENDENTE,
    )
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "objetivo"
        verbose_name_plural = "objetivos"

    @property
    def projeto(self):
        return self.secao.projeto

    def __str__(self):
        return self.titulo


class Subtarefa(TimeStampedModel):
    objetivo = models.ForeignKey(
        Objetivo,
        on_delete=models.CASCADE,
        related_name="subtarefas",
    )
    titulo = models.CharField(max_length=255)
    concluida = models.BooleanField(default=False)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "subtarefa"
        verbose_name_plural = "subtarefas"

    def __str__(self):
        return self.titulo


class ComentarioObjetivo(TimeStampedModel):
    objetivo = models.ForeignKey(
        Objetivo,
        on_delete=models.CASCADE,
        related_name="comentarios",
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="comentarios_objetivo",
    )
    texto = models.TextField()

    class Meta:
        ordering = ["created_at"]
        verbose_name = "comentário"
        verbose_name_plural = "comentários"

    def __str__(self):
        return self.texto[:50]


class TipoCampoPersonalizado(models.TextChoices):
    TEXTO = "TEXTO", "Texto"
    NUMERO = "NUMERO", "Número"
    DATA = "DATA", "Data"


class CampoPersonalizado(models.Model):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="campos_personalizados",
    )
    nome = models.CharField(max_length=120)
    tipo = models.CharField(max_length=10, choices=TipoCampoPersonalizado.choices)
    opcoes = models.JSONField(default=list, blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]
        unique_together = [("projeto", "nome")]
        verbose_name = "campo personalizado"
        verbose_name_plural = "campos personalizados"

    def __str__(self):
        return f"{self.projeto.nome} — {self.nome}"


class ValorCampoPersonalizado(models.Model):
    objetivo = models.ForeignKey(
        Objetivo,
        on_delete=models.CASCADE,
        related_name="valores_campos",
    )
    campo = models.ForeignKey(
        CampoPersonalizado,
        on_delete=models.CASCADE,
        related_name="valores",
    )
    valor_texto = models.CharField(max_length=500, blank=True)
    valor_numero = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_data = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = [("objetivo", "campo")]
        verbose_name = "valor de campo personalizado"
        verbose_name_plural = "valores de campos personalizados"


class DependenciaObjetivo(models.Model):
    predecessora = models.ForeignKey(
        Objetivo,
        on_delete=models.CASCADE,
        related_name="dependencias_saida",
    )
    sucessora = models.ForeignKey(
        Objetivo,
        on_delete=models.CASCADE,
        related_name="dependencias_entrada",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("predecessora", "sucessora")]
        verbose_name = "dependência"
        verbose_name_plural = "dependências"

    def __str__(self):
        return f"{self.predecessora_id} → {self.sucessora_id}"


class TipoVistaGuardada(models.TextChoices):
    LISTA = "lista", "Lista"
    QUADRO = "quadro", "Quadro"
    CALENDARIO = "calendario", "Calendário"
    TIMELINE = "timeline", "Timeline"


class VistaGuardada(TimeStampedModel):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="vistas_guardadas",
    )
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vistas_projetos",
    )
    nome = models.CharField(max_length=120)
    tipo_vista = models.CharField(max_length=12, choices=TipoVistaGuardada.choices)
    filtros = models.JSONField(default=dict, blank=True)
    padrao = models.BooleanField(default=False)

    class Meta:
        ordering = ["-padrao", "nome"]
        unique_together = [("projeto", "utilizador", "nome")]
        verbose_name = "vista guardada"
        verbose_name_plural = "vistas guardadas"

    def __str__(self):
        return f"{self.nome} ({self.projeto.nome})"


class AtividadeProjeto(TimeStampedModel):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="atividades",
    )
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="atividades_projetos",
    )
    objetivo = models.ForeignKey(
        Objetivo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="atividades",
    )
    acao = models.CharField(max_length=80)
    descricao = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "atividade de projeto"
        verbose_name_plural = "atividades de projeto"

    def __str__(self):
        return self.descricao[:80]
