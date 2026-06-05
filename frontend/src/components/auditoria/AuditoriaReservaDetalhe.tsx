import {
  formatarDataHoraAuditoria,
  metadataReservaAuditoria,
  TipoReservaAuditoria
} from "@/lib/auditoriaReserva";

const ESTILOS_CAIXA: Record<TipoReservaAuditoria, { box: string; titulo: string }> = {
  sala: {
    box: "border-sky-200 bg-sky-50",
    titulo: "text-sky-900"
  },
  viatura: {
    box: "border-violet-200 bg-violet-50",
    titulo: "text-violet-900"
  }
};

const ROTULO_RECURSO: Record<TipoReservaAuditoria, string> = {
  sala: "Sala",
  viatura: "Viatura"
};

export default function AuditoriaReservaDetalhe({
  tipo,
  metadata
}: {
  tipo: TipoReservaAuditoria;
  metadata: unknown;
}) {
  const dados = metadataReservaAuditoria(metadata);
  if (!dados) return null;

  const tituloReserva = dados.tituloReserva ?? "Não informado";
  const recursos =
    tipo === "sala"
      ? dados.salas?.length
        ? dados.salas.join(", ")
        : "Não informada"
      : dados.viaturas?.length
        ? dados.viaturas.join(", ")
        : "Não informada";
  const criador = dados.usuarioCriador?.nome
    ? `${dados.usuarioCriador.nome}${dados.usuarioCriador.email ? ` (${dados.usuarioCriador.email})` : ""}`
    : "Não informado";
  const ocorrencias = dados.ocorrencias ?? [];
  const diaReserva = ocorrencias.length
    ? ocorrencias.map((ocorrencia) => formatarDataHoraAuditoria(ocorrencia.dataInicio)).join(" | ")
    : "Não informado";
  const diaReservaFeita = formatarDataHoraAuditoria(dados.pedidoCriadoEm);
  const estilos = ESTILOS_CAIXA[tipo];
  const rotuloRecurso = ROTULO_RECURSO[tipo];
  const recursoNaoInformado = tipo === "sala" ? "Sala não informada" : "Viatura não informada";

  return (
    <div className={`mt-3 rounded-lg border p-3 text-sm text-slate-700 ${estilos.box}`}>
      <p className={`font-semibold ${estilos.titulo}`}>Informações da reserva</p>
      <p className="mt-1">
        <span className="font-medium">Título da reserva:</span> {tituloReserva}
      </p>
      <p>
        <span className="font-medium">{rotuloRecurso}:</span> {recursos}
      </p>
      <p>
        <span className="font-medium">Dia(s) da reserva:</span> {diaReserva}
      </p>
      <p>
        <span className="font-medium">Data em que a reserva foi feita:</span> {diaReservaFeita}
      </p>
      <p>
        <span className="font-medium">Utilizador que criou:</span> {criador}
      </p>
      <div className="mt-2">
        <p className="font-medium">Ocorrências da reserva:</p>
        {ocorrencias.length ? (
          <ul className="mt-1 list-disc pl-5">
            {ocorrencias.map((ocorrencia, index) => {
              const nomeRecurso =
                tipo === "sala"
                  ? (ocorrencia.sala ?? recursoNaoInformado)
                  : (ocorrencia.viatura ?? recursoNaoInformado);
              return (
                <li key={`${nomeRecurso}-${ocorrencia.dataInicio ?? "inicio"}-${index}`}>
                  {nomeRecurso} - {formatarDataHoraAuditoria(ocorrencia.dataInicio)} até{" "}
                  {formatarDataHoraAuditoria(ocorrencia.dataFim)}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1">Sem ocorrências registradas.</p>
        )}
      </div>
    </div>
  );
}
