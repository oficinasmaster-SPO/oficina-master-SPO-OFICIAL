import { useAuth } from "@/lib/AuthContext";

export function useRegistroMeta(origemTela) {
  const { user } = useAuth();

  const buildMeta = (responsavelId, responsavelNome) => ({
    criado_por_id: user?.id,
    criado_por_nome: user?.full_name,
    criado_por_cargo: user?.job_role || "user",
    criado_para_id: responsavelId,
    criado_para_nome: responsavelNome,
    origem_tela: origemTela,
    criado_em: new Date().toISOString(),
    criado_por_terceiro: user?.id !== responsavelId
  });

  return { buildMeta };
}