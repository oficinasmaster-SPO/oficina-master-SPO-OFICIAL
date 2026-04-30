import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";

export default function useDashboardSprints(workshops = []) {
  const queryClient = useQueryClient();
  const workshopIds = useMemo(() => workshops.map(w => w.id), [workshops]);
  // stable string key to avoid re-creating queries when array reference changes
  const workshopIdsKey = workshopIds.join(',');

  const { data: sprints = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-sprints', workshopIdsKey],
    queryFn: async () => {
      const ids = workshopIdsKey.split(',').filter(Boolean);
      if (!ids.length) return [];
      // BUG FIX: Limitar Promise.all() a máximo 3 requisições simultâneas para evitar 429
      // Ao invés de fazer N requests em paralelo, fazer em batches
      const batchSize = 3;
      const allResults = [];
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(id => base44.entities.ConsultoriaSprint.filter({ workshop_id: id }).catch(() => []))
        );
        allResults.push(...batchResults);
      }
      return allResults.flat();
    },
    staleTime: 5 * 60 * 1000, // 5 min (foi 2 min)
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale', // só refetch se dados estão stale
    enabled: workshopIds.length > 0,
    placeholderData: []
  });

  // Subscribe em tempo real: qualquer sprint de qualquer workshop gerenciado invalida o cache
  // Dep: workshopIdsKey (string) — Set não tem referential equality e causaria reinit a cada render
  useEffect(() => {
    const ids = workshopIdsKey.split(',').filter(Boolean);
    if (!ids.length) return;
    const idSet = new Set(ids);
    const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
      if (event.data?.workshop_id && idSet.has(event.data.workshop_id)) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-sprints'] });
        queryClient.invalidateQueries({ queryKey: ['active-sprint-widget'] });
      }
    });
    return unsubscribe;
  }, [workshopIdsKey, queryClient]);

  const workshopMap = useMemo(
    () => Object.fromEntries(workshops.map(w => [w.id, w])),
    [workshops]
  );

  const sprintsAtrasados = useMemo(
    () => sprints
      .filter(s => s.status === "overdue")
      .sort((a, b) => {
        const daysA = a.end_date ? differenceInDays(new Date(), new Date(a.end_date)) : 0;
        const daysB = b.end_date ? differenceInDays(new Date(), new Date(b.end_date)) : 0;
        return daysB - daysA; // mais atrasado primeiro
      }),
    [sprints]
  );

  const sprintsEmAndamento = useMemo(
    () => sprints.filter(s => s.status === "in_progress" || s.status === "pending"),
    [sprints]
  );

  const clientesComTrilha = useMemo(() => {
    return workshops
      .map(w => {
        const ws = sprints.filter(s => s.workshop_id === w.id);
        if (!ws.length) return null;
        const avg = Math.round(ws.reduce((a, s) => a + (s.progress_percentage || 0), 0) / ws.length);
        const hasOverdue = ws.some(s => s.status === "overdue");
        const hasInProgress = ws.some(s => s.status === "in_progress");
        const hasPending = ws.some(s => s.status === "pending");
        const pendingCount = ws.filter(s => s.status === "pending").length;
        return { workshop: w, sprints: ws, avgProgress: avg, hasOverdue, hasInProgress, hasPending, pendingCount };
      })
      .filter(Boolean)
      .sort((a, b) => b.sprints.length - a.sprints.length);
  }, [workshops, sprints]);

  const sprintsConcluidos = useMemo(
    () => sprints
      .filter(s => s.status === "completed")
      .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)),
    [sprints]
  );

  const sprintsPendingReview = useMemo(() => {
    return sprints
      .map(sprint => {
        const pendingPhases = (sprint.phases || []).filter(p => p.status === "pending_review");
        if (!pendingPhases.length) return null;
        return { sprint, pendingPhases, workshop: workshopMap[sprint.workshop_id] };
      })
      .filter(Boolean);
  }, [sprints, workshopMap]);

  const stats = useMemo(() => {
    const t = sprints.length;
    return {
      total: t,
      em_andamento: sprintsEmAndamento.length,
      atrasados: sprintsAtrasados.length,
      pendingReview: sprintsPendingReview.length,
      concluidos: sprints.filter(s => s.status === "completed").length,
      avgProgress: t > 0 ? Math.round(sprints.reduce((acc, s) => acc + (s.progress_percentage || 0), 0) / t) : 0
    };
  }, [sprints, sprintsEmAndamento, sprintsAtrasados, sprintsPendingReview]);

  return {
    sprints,
    sprintsAtrasados,
    sprintsEmAndamento,
    sprintsConcluidos,
    sprintsPendingReview,
    clientesComTrilha,
    workshopMap,
    stats,
    isLoading,
    refetch
  };
}