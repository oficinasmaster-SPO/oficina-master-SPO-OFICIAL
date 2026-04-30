import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useWorkshopsAtivos(userId = null) {
  return useQuery({
    queryKey: ['workshops-ativos', userId],
    queryFn: async () => {
      // DS-04: retornar todos os workshops ativos — filtro de plano é responsabilidade do contexto de uso
      // (ex: bloquear criação de sprint para FREE, mas mostrar sprints existentes no dashboard)
      return await base44.entities.Workshop.filter({ status: 'ativo' }, 'name', 5000);
    },
    enabled: !!userId, // DS-01: aguardar user carregar antes de buscar workshops
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale'
  });
}