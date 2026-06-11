/** Rótulos legíveis para tipos de auditoria (sincronizado com portic_crm/core/audit.py). */
const ROTULOS_ACAO: Record<string, string> = {
  LOGIN: "Login efectuado",
  USER_CRIADO: "Utilizador criado",
  USER_EDITADO: "Utilizador editado",
  USER_DESATIVADO: "Utilizador desactivado",
  GRUPO_PERMISSOES: "Permissões de grupo alteradas",
  SISTEMA_CONFIG: "Configuração do sistema alterada",
  BACKUP_REGISTADO: "Backup registado",
  TIPO_INTER_CRIADO: "Tipo de interação criado",
  TIPO_INTER_EDITADO: "Tipo de interação editado",
  TIPO_INTER_REMOVIDO: "Tipo de interação removido/desactivado",
  TIPO_HIST_CRIADO: "Tipo de histórico criado",
  TIPO_HIST_EDITADO: "Tipo de histórico editado",
  TIPO_HIST_REMOVIDO: "Tipo de histórico removido/desactivado",
  ESTADO_CAND_CRIADO: "Estado de candidatura criado",
  ESTADO_CAND_EDITADO: "Estado de candidatura editado",
  ESTADO_CAND_REMOVIDO: "Estado de candidatura removido/desactivado",
  EMPRESA_CRIADA: "Empresa criada",
  EMPRESA_EDITADA: "Empresa editada",
  EMP_INTER_EDITADA: "Interação com empresa editada",
  EMP_INTER_REMOVIDA: "Interação com empresa removida",
  EDICAO_CRIADA: "Edição de startups criada",
  EDICAO_EDITADA: "Edição de startups editada",
  FORMULARIO_CRIADO: "Formulário de candidatura criado",
  FORMULARIO_EDITADO: "Formulário de candidatura editado",
  CANDIDATURA_ESTADO: "Estado de candidatura alterado",
  CANDIDATURA_SUBMETIDA: "Candidatura submetida (público)",
  CAND_HIST_EDITADO: "Histórico de candidatura editado",
  CAND_HIST_REMOVIDO: "Histórico de candidatura removido",
  PROJETO_CRIADO: "Projeto criado",
  PROJETO_ATUALIZADO: "Projeto actualizado",
  PROJETO_ESTADO: "Estado do projeto alterado",
  SECAO_CRIADA: "Secção criada",
  SECAO_ATUALIZADA: "Secção actualizada",
  SECAO_ELIMINADA: "Secção eliminada",
  TAREFA_CRIADA: "Tarefa criada",
  TAREFA_ATUALIZADA: "Tarefa actualizada",
  TAREFA_ESTADO: "Estado da tarefa alterado",
  TAREFA_ELIMINADA: "Tarefa eliminada",
  SUBTAREFA_CRIADA: "Subtarefa criada",
  SUBTAREFA_ATUALIZADA: "Subtarefa actualizada",
  SUBTAREFA_ELIMINADA: "Subtarefa eliminada",
  COMENTARIO: "Comentário em tarefa",
  DEPENDENCIA: "Dependência entre tarefas",
  DEPENDENCIA_REMOVIDA: "Dependência removida",
  CAMPO_CRIADO: "Campo personalizado criado",
  CAMPO_REMOVIDO: "Campo personalizado removido",
};

export const TIPOS_AUDITORIA = Object.entries(ROTULOS_ACAO).map(([codigo, label]) => ({
  codigo,
  label,
}));

export function rotuloAcaoAuditoria(acao: string, entidade?: string): string {
  if (ROTULOS_ACAO[acao]) return ROTULOS_ACAO[acao];
  if (entidade?.startsWith("empresas.empresa")) return "Interação com empresa registada";
  if (entidade?.startsWith("startups.candidatura")) return "Histórico de contacto registado";
  if (entidade?.startsWith("projetos.")) return ROTULOS_ACAO[acao] ?? acao.replace(/_/g, " ").toLowerCase();
  return acao.replace(/_/g, " ").toLowerCase();
}
