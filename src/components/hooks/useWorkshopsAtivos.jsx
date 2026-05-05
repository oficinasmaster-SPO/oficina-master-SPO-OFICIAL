import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useWorkshopsAtivos(userId = null) {
  return useQuery({
    queryKey: ['workshops-ativos', userId],
    queryFn: async () => {
      // DS-04: retornar todos os workshops ativos — filtro de plano é responsabilidade do contexto de uso
      // (ex: bloquear criação de sprint para FREE, mas mostrar sprints existentes no dashboard)
      // CON-05: reduzido de 5000 para 500 — RLS já filtra por consulting_firm_id
      const result = await base44.entities.Workshop.filter({ status: 'ativo' }, 'name', 500);
      if (result.length === 0) {
        console.warn('[useWorkshopsAtivos] Retornou 0 workshops para userId:', userId, '— verifique consulting_firm_id no perfil e nos workshops');
      } else {
        console.log(`[useWorkshopsAtivos] ${result.length} workshops carregados via RLS`);
      }
      return result;
    },
    enabled: !!userId, // DS-01: aguardar user carregar antes de buscar workshops
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale'
  });
}