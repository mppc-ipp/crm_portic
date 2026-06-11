from django.core.management.base import BaseCommand
from django.utils import timezone

from portic_crm.administrador.models import ConfiguracaoSistema
from portic_crm.core.audit import AcaoAuditoria, registar_auditoria


class Command(BaseCommand):
    help = "Regista a data/hora do último backup na configuração do sistema."

    def handle(self, *args, **options):
        cfg = ConfiguracaoSistema.get_solo()
        cfg.backup_ultimo = timezone.now()
        cfg.save(update_fields=["backup_ultimo", "atualizado_em"])
        registar_auditoria(
            AcaoAuditoria.BACKUP_REGISTADO,
            f"Backup registado automaticamente ({cfg.backup_ultimo.isoformat()})",
            actor=None,
            alvo=cfg,
        )
        self.stdout.write(self.style.SUCCESS(f"Backup registado: {cfg.backup_ultimo.isoformat()}"))
