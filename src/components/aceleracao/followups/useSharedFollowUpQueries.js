import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Cache único compartilhado de FollowUpReminder (pendentes) e FollowUpConcluido
 * entre FollowUpsTab e OperationSidebar. Evita leituras duplicadas da mesma
 * entidade no mount da Central de Follow-up (Sprint 3 — P1).
 *
 * - usePendentes(consultorId): pendentes do consultor + guarda-chuva (null = todos)
 * - useConcluidos(consultorId): FollowUpConcluido do consultor (null = todos)
 *
 * O OperationSidebar filtra client-side por consultor_id para preservar a
 * semântica original (exclui guarda-chuva das contagens "Minha Operação").
 */

export function usePendentes(consultorId) {
  return useQuery({
    queryKey: ["follow-up-reminders-tab", consultorId],
    queryFn: async () => {
      const query = { is_completed: false };
      if (consultorId) {
        query.$or = [{ consultor_id: consultorId }, { origin_type: "guarda_chuva" }];
      }
      const items = await base44.entities.FollowUpReminder.filter(query, "-reminder_date", 200);
      return Array.isArray(items) ? items : [];
    },
    enabled: consultorId !== undefined,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useConcluidos(consultorId) {
  return useQuery({
    queryKey: ["follow-up-concluidos-tab", consultorId],
    queryFn: async () => {
      const query = {};
      if (consultorId) query.consultor_id = consultorId;
      const items = await base44.entities.FollowUpConcluido.filter(query, "-completedAt", 200);
      return (Array.isArray(items) ? items : []).map(c => {
        if (!c || !c.pastedImages) return c;
        const { pastedImages: _drop, ...rest } = c;
        return rest;
      });
    },
    enabled: consultorId !== undefined,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}