export type TipoUsuario = "INTERNO" | "EXTERNO" | "SUPER_ADMIN";

export type SessaoUtilizador = {
  id: string;
  nome: string;
  email: string;
  telemovel: string | null;
  tipo: TipoUsuario;
};
