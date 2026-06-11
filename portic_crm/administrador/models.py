from django.conf import settings
from django.db import models


class ConfiguracaoSistema(models.Model):
    """Configuração singleton — políticas de backup e notas de manutenção."""

    class FrequenciaBackup(models.TextChoices):
        DIARIA = "diaria", "Diária"
        SEMANAL = "semanal", "Semanal"
        MENSAL = "mensal", "Mensal"

    backup_frequencia = models.CharField(
        max_length=20,
        choices=FrequenciaBackup.choices,
        default=FrequenciaBackup.DIARIA,
    )
    backup_retencao_dias = models.PositiveIntegerField(default=30)
    backup_localizacao = models.CharField(
        max_length=255,
        blank=True,
        default="Volume Docker postgres_data + media_data",
    )
    backup_automatico = models.BooleanField(
        default=False,
        help_text="Indica se existe rotina automática configurada no servidor.",
    )
    backup_ultimo = models.DateTimeField(null=True, blank=True)
    backup_notas = models.TextField(blank=True)
    notas_manutencao = models.TextField(blank=True)
    politica_seguranca_notas = models.TextField(
        blank=True,
        help_text="Notas internas sobre política de segurança e acessos.",
    )
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "configuração do sistema"
        verbose_name_plural = "configurações do sistema"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Configuração do sistema"


class PerfilUtilizador(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
    )
    telemovel = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = "perfil de utilizador"
        verbose_name_plural = "perfis de utilizador"
        permissions = [
            ("gerir_utilizadores", "Gerir utilizadores e permissões"),
        ]

    def __str__(self):
        return f"Perfil — {self.user.username}"
