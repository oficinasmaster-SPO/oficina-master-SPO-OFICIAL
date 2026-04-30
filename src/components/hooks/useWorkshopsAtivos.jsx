import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useWorkshopsAtivos() {
  return useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.filter({ status: 'ativo' }, 'name', 5000);
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    staleTime: 15 * 60 * 1000, // 15 min (foi 10 min)
    refetchOnWindowFocus: false, // evita refetch ao trocar de aba
    refetchOnMount: 'stale' // só refetch se dados estão stale
  });
}