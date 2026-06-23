type Props = {
  entradaTitulos?: string[];
  saidaTitulos?: string[];
  /** Em cartões estreitos mostra só contagem; na lista mostra nomes truncados. */
  compact?: boolean;
};

function rotuloEntrada(titulos: string[], compact: boolean) {
  if (titulos.length === 0) return null;
  if (compact) return `← ${titulos.length}`;
  if (titulos.length === 1) return `← ${titulos[0]}`;
  return `← ${titulos.length} deps`;
}

function rotuloSaida(titulos: string[], compact: boolean) {
  if (titulos.length === 0) return null;
  if (compact) return `→ ${titulos.length}`;
  if (titulos.length === 1) return `→ ${titulos[0]}`;
  return `→ ${titulos.length} bloqueadas`;
}

export default function DependencyIndicators({
  entradaTitulos = [],
  saidaTitulos = [],
  compact = false,
}: Props) {
  const entrada = entradaTitulos.filter(Boolean);
  const saida = saidaTitulos.filter(Boolean);
  if (!entrada.length && !saida.length) return null;

  const entradaLabel = rotuloEntrada(entrada, compact);
  const saidaLabel = rotuloSaida(saida, compact);

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {entradaLabel && (
        <span
          title={entrada.length ? `Depende de: ${entrada.join(", ")}` : undefined}
          className="inline-flex max-w-[140px] items-center truncate rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
        >
          {entradaLabel}
        </span>
      )}
      {saidaLabel && (
        <span
          title={saida.length ? `Bloqueia: ${saida.join(", ")}` : undefined}
          className="inline-flex max-w-[140px] items-center truncate rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
        >
          {saidaLabel}
        </span>
      )}
    </span>
  );
}
