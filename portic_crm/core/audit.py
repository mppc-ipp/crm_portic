"""Registo centralizado de acções na auditoria global (HistoricoEntrada)."""

from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from portic_crm.core.models import HistoricoEntrada


class AcaoAuditoria:
    # Autenticação
    LOGIN = "LOGIN"

    # Administração — utilizadores e grupos
    USER_CRIADO = "USER_CRIADO"
    USER_EDITADO = "USER_EDITADO"
    USER_DESATIVADO = "USER_DESATIVADO"
    GRUPO_PERMISSOES = "GRUPO_PERMISSOES"

    # Administração — sistema
    SISTEMA_CONFIG = "SISTEMA_CONFIG"
    BACKUP_REGISTADO = "BACKUP_REGISTADO"

    # Configuração CRM — empresas
    TIPO_INTERACAO_CRIADO = "TIPO_INTER_CRIADO"
    TIPO_INTERACAO_EDITADO = "TIPO_INTER_EDITADO"
    TIPO_INTERACAO_REMOVIDO = "TIPO_INTER_REMOVIDO"

    # Configuração CRM — startups
    TIPO_HISTORICO_CRIADO = "TIPO_HIST_CRIADO"
    TIPO_HISTORICO_EDITADO = "TIPO_HIST_EDITADO"
    TIPO_HISTORICO_REMOVIDO = "TIPO_HIST_REMOVIDO"
    ESTADO_CAND_CRIADO = "ESTADO_CAND_CRIADO"
    ESTADO_CAND_EDITADO = "ESTADO_CAND_EDITADO"
    ESTADO_CAND_REMOVIDO = "ESTADO_CAND_REMOVIDO"

    # Empresas
    EMPRESA_CRIADA = "EMPRESA_CRIADA"
    EMPRESA_EDITADA = "EMPRESA_EDITADA"

    # Startups
    EDICAO_CRIADA = "EDICAO_CRIADA"
    EDICAO_EDITADA = "EDICAO_EDITADA"
    FORMULARIO_CRIADO = "FORMULARIO_CRIADO"
    FORMULARIO_EDITADO = "FORMULARIO_EDITADO"
    CANDIDATURA_ESTADO = "CANDIDATURA_ESTADO"
    CANDIDATURA_SUBMETIDA = "CANDIDATURA_SUBMETIDA"
    CAND_HIST_EDITADO = "CAND_HIST_EDITADO"
    CAND_HIST_REMOVIDO = "CAND_HIST_REMOVIDO"

    EMPRESA_INTER_EDITADA = "EMP_INTER_EDITADA"
    EMPRESA_INTER_REMOVIDA = "EMP_INTER_REMOVIDA"

    # Projetos
    PROJETO_CRIADO = "PROJETO_CRIADO"
    PROJETO_ATUALIZADO = "PROJETO_ATUALIZADO"
    PROJETO_ESTADO = "PROJETO_ESTADO"
    SECAO_CRIADA = "SECAO_CRIADA"
    SECAO_ATUALIZADA = "SECAO_ATUALIZADA"
    SECAO_ELIMINADA = "SECAO_ELIMINADA"
    TAREFA_CRIADA = "TAREFA_CRIADA"
    TAREFA_ATUALIZADA = "TAREFA_ATUALIZADA"
    TAREFA_ESTADO = "TAREFA_ESTADO"
    TAREFA_ELIMINADA = "TAREFA_ELIMINADA"
    SUBTAREFA_CRIADA = "SUBTAREFA_CRIADA"
    SUBTAREFA_ATUALIZADA = "SUBTAREFA_ATUALIZADA"
    SUBTAREFA_ELIMINADA = "SUBTAREFA_ELIMINADA"
    COMENTARIO = "COMENTARIO"
    DEPENDENCIA = "DEPENDENCIA"
    DEPENDENCIA_REMOVIDA = "DEPENDENCIA_REMOVIDA"
    CAMPO_CRIADO = "CAMPO_CRIADO"
    CAMPO_REMOVIDO = "CAMPO_REMOVIDO"

    # Dashboard — eventos
    EVENTO_CRIADO = "EVENTO_CRIADO"
    EVENTO_EDITADO = "EVENTO_EDITADO"
    EVENTO_REMOVIDO = "EVENTO_REMOVIDO"
    EVENTO_ANEXO_ADICIONADO = "EVENTO_ANEXO_ADD"
    EVENTO_ANEXO_REMOVIDO = "EVENTO_ANEXO_DEL"
    TIPO_EVENTO_CRIADO = "TIPO_EVENTO_CRIADO"
    TIPO_EVENTO_EDITADO = "TIPO_EVENTO_EDITADO"
    TIPO_EVENTO_REMOVIDO = "TIPO_EVENTO_REMOVIDO"


ROTULOS_AUDITORIA: dict[str, str] = {
    AcaoAuditoria.LOGIN: "Login efectuado",
    AcaoAuditoria.USER_CRIADO: "Utilizador criado",
    AcaoAuditoria.USER_EDITADO: "Utilizador editado",
    AcaoAuditoria.USER_DESATIVADO: "Utilizador desactivado",
    AcaoAuditoria.GRUPO_PERMISSOES: "Permissões de grupo alteradas",
    AcaoAuditoria.SISTEMA_CONFIG: "Configuração do sistema alterada",
    AcaoAuditoria.BACKUP_REGISTADO: "Backup registado",
    AcaoAuditoria.TIPO_INTERACAO_CRIADO: "Tipo de interação criado",
    AcaoAuditoria.TIPO_INTERACAO_EDITADO: "Tipo de interação editado",
    AcaoAuditoria.TIPO_INTERACAO_REMOVIDO: "Tipo de interação removido/desactivado",
    AcaoAuditoria.TIPO_HISTORICO_CRIADO: "Tipo de histórico criado",
    AcaoAuditoria.TIPO_HISTORICO_EDITADO: "Tipo de histórico editado",
    AcaoAuditoria.TIPO_HISTORICO_REMOVIDO: "Tipo de histórico removido/desactivado",
    AcaoAuditoria.ESTADO_CAND_CRIADO: "Estado de candidatura criado",
    AcaoAuditoria.ESTADO_CAND_EDITADO: "Estado de candidatura editado",
    AcaoAuditoria.ESTADO_CAND_REMOVIDO: "Estado de candidatura removido/desactivado",
    AcaoAuditoria.EMPRESA_CRIADA: "Empresa criada",
    AcaoAuditoria.EMPRESA_EDITADA: "Empresa editada",
    AcaoAuditoria.EDICAO_CRIADA: "Edição de startups criada",
    AcaoAuditoria.EDICAO_EDITADA: "Edição de startups editada",
    AcaoAuditoria.FORMULARIO_CRIADO: "Formulário de candidatura criado",
    AcaoAuditoria.FORMULARIO_EDITADO: "Formulário de candidatura editado",
    AcaoAuditoria.CANDIDATURA_ESTADO: "Estado de candidatura alterado",
    AcaoAuditoria.CANDIDATURA_SUBMETIDA: "Candidatura submetida (público)",
    AcaoAuditoria.CAND_HIST_EDITADO: "Histórico de candidatura editado",
    AcaoAuditoria.CAND_HIST_REMOVIDO: "Histórico de candidatura removido",
    AcaoAuditoria.EMPRESA_INTER_EDITADA: "Interação com empresa editada",
    AcaoAuditoria.EMPRESA_INTER_REMOVIDA: "Interação com empresa removida",
    AcaoAuditoria.PROJETO_CRIADO: "Projeto criado",
    AcaoAuditoria.PROJETO_ATUALIZADO: "Projeto actualizado",
    AcaoAuditoria.PROJETO_ESTADO: "Estado do projeto alterado",
    AcaoAuditoria.SECAO_CRIADA: "Secção criada",
    AcaoAuditoria.SECAO_ATUALIZADA: "Secção actualizada",
    AcaoAuditoria.SECAO_ELIMINADA: "Secção eliminada",
    AcaoAuditoria.TAREFA_CRIADA: "Tarefa criada",
    AcaoAuditoria.TAREFA_ATUALIZADA: "Tarefa actualizada",
    AcaoAuditoria.TAREFA_ESTADO: "Estado da tarefa alterado",
    AcaoAuditoria.TAREFA_ELIMINADA: "Tarefa eliminada",
    AcaoAuditoria.SUBTAREFA_CRIADA: "Subtarefa criada",
    AcaoAuditoria.SUBTAREFA_ATUALIZADA: "Subtarefa actualizada",
    AcaoAuditoria.SUBTAREFA_ELIMINADA: "Subtarefa eliminada",
    AcaoAuditoria.COMENTARIO: "Comentário em tarefa",
    AcaoAuditoria.DEPENDENCIA: "Dependência entre tarefas",
    AcaoAuditoria.DEPENDENCIA_REMOVIDA: "Dependência removida",
    AcaoAuditoria.CAMPO_CRIADO: "Campo personalizado criado",
    AcaoAuditoria.CAMPO_REMOVIDO: "Campo personalizado removido",
    AcaoAuditoria.EVENTO_CRIADO: "Evento criado",
    AcaoAuditoria.EVENTO_EDITADO: "Evento editado",
    AcaoAuditoria.EVENTO_REMOVIDO: "Evento removido",
    AcaoAuditoria.EVENTO_ANEXO_ADICIONADO: "Anexo adicionado a evento",
    AcaoAuditoria.EVENTO_ANEXO_REMOVIDO: "Anexo removido de evento",
    AcaoAuditoria.TIPO_EVENTO_CRIADO: "Tipo de evento criado",
    AcaoAuditoria.TIPO_EVENTO_EDITADO: "Tipo de evento editado",
    AcaoAuditoria.TIPO_EVENTO_REMOVIDO: "Tipo de evento removido/desactivado",
}


def rotulo_auditoria(acao: str) -> str:
    return ROTULOS_AUDITORIA.get(acao, acao.replace("_", " ").title())


def rotulo_entrada_auditoria(entrada: HistoricoEntrada) -> str:
    """Rótulo legível incluindo movimentos de empresas/startups sem código AUDIT_*."""
    if entrada.tipo in ROTULOS_AUDITORIA:
        return ROTULOS_AUDITORIA[entrada.tipo]
    app = entrada.content_type.app_label
    model = entrada.content_type.model
    if app == "empresas" and model == "empresa":
        return "Interação com empresa registada"
    if app == "startups" and model == "candidatura":
        return "Histórico de contacto registado"
    if app == "projetos":
        return rotulo_auditoria(entrada.tipo)
    return entrada.tipo.replace("_", " ").title()


def _alvo_fallback():
    from portic_crm.administrador.models import ConfiguracaoSistema

    return ConfiguracaoSistema.get_solo()


def registar_auditoria(acao: str, conteudo: str, *, actor=None, alvo=None, data=None) -> HistoricoEntrada:
    """Cria entrada na auditoria global."""
    if alvo is None:
        alvo = _alvo_fallback()
    ct = ContentType.objects.get_for_model(alvo, for_concrete_model=False)
    utilizador = actor if getattr(actor, "is_authenticated", False) else None
    return HistoricoEntrada.objects.create(
        content_type=ct,
        object_id=alvo.pk,
        tipo=acao[:40],
        conteudo=conteudo[:4000],
        data=data or timezone.localdate(),
        registado_por=utilizador,
    )
