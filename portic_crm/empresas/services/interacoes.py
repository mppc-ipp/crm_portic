from portic_crm.core.audit import ROTULOS_AUDITORIA


def queryset_interacoes_empresa(empresa):
    """Interações reais da empresa — exclui entradas de auditoria (ex.: EMPRESA_EDITADA)."""
    return empresa.historicos.exclude(tipo__in=ROTULOS_AUDITORIA)
