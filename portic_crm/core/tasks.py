from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="portic_crm.core.tasks.limpar_ficheiros_orfaos")
def limpar_ficheiros_orfaos():
    """Remove ficheiros órfãos antigos quando a limpeza automática está ativa.

    Atua apenas sobre ficheiros sem registo na base de dados (órfãos) com mais
    do que ``limpeza_ficheiros_dias`` dias. Ficheiros referenciados nunca são
    apagados, para não quebrar registos.
    """
    from portic_crm.administrador.models import ConfiguracaoSistema
    from portic_crm.core import files_inventory
    from portic_crm.core.audit import AcaoAuditoria, registar_auditoria

    cfg = ConfiguracaoSistema.get_solo()
    if not cfg.limpeza_ficheiros_automatica or cfg.limpeza_ficheiros_dias <= 0:
        return

    orfaos = files_inventory.listar_orfaos(idade_minima_dias=cfg.limpeza_ficheiros_dias)
    if not orfaos:
        cfg.limpeza_ficheiros_ultima = timezone.now()
        cfg.save(update_fields=["limpeza_ficheiros_ultima", "atualizado_em"])
        return

    resultado = files_inventory.apagar_caminhos([o["caminho_disco"] for o in orfaos])
    cfg.limpeza_ficheiros_ultima = timezone.now()
    cfg.save(update_fields=["limpeza_ficheiros_ultima", "atualizado_em"])

    megabytes = resultado["bytes_libertados"] / (1024 * 1024)
    logger.info(
        "Limpeza automática de ficheiros: %s removidos (%.1f MB)",
        resultado["total_apagados"],
        megabytes,
    )
    if resultado["total_apagados"]:
        registar_auditoria(
            AcaoAuditoria.FICHEIROS_LIMPOS,
            (
                f"Limpeza automática removeu {resultado['total_apagados']} ficheiro(s) "
                f"órfão(s) ({megabytes:.1f} MB libertados)"
            ),
        )
