/** Primeira hora visível no calendário diário/semanal (rótulo 07:00). */
export const CALENDARIO_HORA_INICIO = 7;

/** Hora em que termina o último bloco selecionável (23:00). */
export const CALENDARIO_HORA_FIM = 23;

export const CALENDARIO_HORAS = Array.from(
  { length: CALENDARIO_HORA_FIM - CALENDARIO_HORA_INICIO },
  (_, i) => i + CALENDARIO_HORA_INICIO
);
