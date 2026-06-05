import { corAvatar, iniciais } from "./utils";

export default function Avatar({ nome, tamanho = "sm" }: { nome: string | null; tamanho?: "sm" | "md" }) {
  const dim = tamanho === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  if (!nome) {
    return (
      <span
        className={`inline-flex ${dim} items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400`}
        title="Sem responsável"
      >
        +
      </span>
    );
  }
  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full font-semibold text-white ${corAvatar(nome)}`}
      title={nome}
    >
      {iniciais(nome)}
    </span>
  );
}
