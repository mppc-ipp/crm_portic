import Link from "next/link";
import { API_URL } from "@/lib/api";
import { Sala } from "@/lib/types";

export default function RoomCard({ sala }: { sala: Sala }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <img
        src={sala.fotoUrl ? `${API_URL}${sala.fotoUrl}` : "https://placehold.co/600x300?text=Sala"}
        alt={sala.nome}
        className="mb-3 h-36 w-full rounded-lg object-cover"
      />
      <h3 className="text-lg font-semibold">{sala.nome}</h3>
      <p className="text-sm text-slate-600">{sala.descricao}</p>
      <p className="mt-2 text-sm">Capacidade: {sala.capacidade}</p>
      <p className="text-sm">Localização: {sala.localizacao}</p>
      <p className="text-sm">Acessível: {sala.mobilidadeReduzida ? "Sim" : "Não"}</p>
      <Link href={`/salas/${sala.id}/calendario`} className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm text-white">
        Ver calendário
      </Link>
    </article>
  );
}
