import { TipoReservaAuditoria } from "@/lib/auditoriaReserva";

const ESTILOS: Record<TipoReservaAuditoria, string> = {
  sala: "bg-sky-100 text-sky-800 border border-sky-200",
  viatura: "bg-violet-100 text-violet-800 border border-violet-200"
};

const ROTULOS: Record<TipoReservaAuditoria, string> = {
  sala: "Reserva de sala",
  viatura: "Reserva de viatura"
};

export default function AuditoriaReservaBadge({ tipo }: { tipo: TipoReservaAuditoria }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILOS[tipo]}`}>
      {ROTULOS[tipo]}
    </span>
  );
}
