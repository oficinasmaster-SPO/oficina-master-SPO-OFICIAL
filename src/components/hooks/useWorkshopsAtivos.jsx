import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useWorkshopsAtivos(userId = null) {
  return useQuery({
    queryKey: ['workshops-ativos', userId],
    queryFn: async () => {
      const all = await base44.entities.Workshop.filter({ status: 'ativo' }, 'name', 5000);
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: !!userId, // DS-01: aguardar user carregar antes de buscar workshops
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale'
  });
}