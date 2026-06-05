import Link from "next/link";
import { API_URL } from "@/lib/api";
import { Viatura } from "@/lib/types";

export default function VehicleCard({ viatura }: { viatura: Viatura }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <img
        src={viatura.fotoUrl ? `${API_URL}${viatura.fotoUrl}` : "https://placehold.co/600x300?text=Viatura"}
        alt={viatura.nome}
        className="mb-3 h-36 w-full rounded-lg object-cover"
      />
      <h3 className="text-lg font-semibold">{viatura.nome}</h3>
      {(viatura.marca || viatura.modelo) && (
        <p className="text-sm text-slate-600">
          {[viatura.marca, viatura.modelo].filter(Boolean).join(" ")}
        </p>
      )}
      <p className="mt-2 text-sm">Matrícula: {viatura.matricula}</p>
      {viatura.cor && <p className="text-sm">Cor: {viatura.cor}</p>}
      <p className="text-sm">Lugares: {viatura.capacidade}</p>
      <p className="text-sm">Localização: {viatura.localizacao}</p>
      <Link
        href={`/viaturas/viaturas/${viatura.id}/calendario`}
        className="mt-3 inline-block rounded bg-cyan-700 px-3 py-2 text-sm text-white"
      >
        Ver calendário
      </Link>
    </article>
  );
}
