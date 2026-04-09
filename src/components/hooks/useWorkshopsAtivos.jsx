import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useWorkshopsAtivos() {
  return useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.filter({ status: 'ativo' }, 'name', 5000);
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    staleTime: 10 * 60 * 1000
  });
}