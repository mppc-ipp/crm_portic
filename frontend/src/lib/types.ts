export type TipoUsuario = "INTERNO" | "EXTERNO" | "SUPER_ADMIN";

export type SessaoUtilizador = {
  id: string;
  nome: string;
  email: string;
  telemovel: string | null;
  tipo: TipoUsuario;
};

/** Eventos de reserva (salas/viaturas) */
export type EventoCalendario = {
  id: string;
  salaId?: string;
  dataInicio: string;
  dataFim: string;
  status?: string;
  title: string;
  descricao?: string;
  tipo?: string;
  tipoCor?: string;
  tipoNome?: string;
  editable: boolean;
  pedidoReservaId?: string;
  usuario?: { nome: string; email: string };
};
