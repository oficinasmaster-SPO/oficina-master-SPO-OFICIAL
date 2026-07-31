import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Índice leve de FollowUpConcluido via backend `getFollowupIndex`.
 *
 * Retorna uma projeção mínima (id, workshop_id, completedAt,
 * created_date, followup_id, resultado) — ~10x menor que a listagem
 * completa de 2000 registros. Substitui o `useConcluidosIndex` legado
 * e a query duplicada em `useSidePanelPriorities`.
 *
 * Mesma query key compartilhada entre todos os consumidores → 1 read
 * para toda a Central de Follow-up.
 */
export function useFollowupIndex() {
  return useQuery({
    queryKey: ["followup-index-light"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getFollowupIndex", {});
      return res?.data?.index ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}