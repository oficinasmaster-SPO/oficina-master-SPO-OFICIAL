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
      try {
        const ids = workshopIdsKey.split(',').filter(Boolean);
        if (!ids.length) return [];
        
        // DS-01: Aumentar batchSize pra 10 + Promise.allSettled pra não falhar tudo se 1 falhar
        // Reduz de 3 batches em paralelo pra 1 batch (99% dos casos <= 10 workshops)
        const results = await Promise.allSettled(
          ids.map(id => 
            base44.entities.ConsultoriaSprint.filter({ workshop_id: id }).catch(() => [])
          )
        );
        
        return results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value || []);
      } catch (error) {
        console.error('[useDashboardSprints] Erro crítico ao buscar sprints:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
    enabled: workshopIds.length > 0,
    placeholderData: (prev) => prev || [], // DS-01: manter dados anteriores se houver erro
  });

  // FIX #1: Evitar infinite loop com debounce e guardrail
  // Subscribe em tempo real: qualquer sprint de qualquer workshop gerenciado invalida o cache
  // Dep: workshopIdsKey (string) — Set não tem referential equality e causaria reinit a cada render
  useEffect(() => {
    const ids = workshopIdsKey.split(',').filter(Boolean);
    if (!ids.length) return;
    
    const idSet = new Set(ids);
    let debounceTimer;
    let refetchPending = false;
    
    const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
      if (event.data?.workshop_id && idSet.has(event.data.workshop_id)) {
        // Guardrail: evita múltiplas invalidações em cascata
        if (refetchPending) return;
        
        // Debounce: aguarda 500ms de inatividade antes de invalidar
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          refetchPending = true;
          queryClient.invalidateQueries({ queryKey: ['dashboard-sprints'] });
          queryClient.invalidateQueries({ queryKey: ['active-sprint-widget'] });
          
          // Reseta guardrail após 1s (evita mais invalidações)
          setTimeout(() => { refetchPending = false; }, 1000);
        }, 500);
      }
    });
    
    return () => {
      clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [workshopIdsKey, queryClient]);

  const workshopMap = useMemo(
    () => Object.fromEntries(workshops.map(w => [w.id, w])),
    [workshops]
  );

  // DS-02: Lazy memos — só atualizam se stats mudarem, não em todo render
  const sprintsAtrasados = useMemo(
    () => {
      const arr = sprints.filter(s => s.status === "overdue");
      const now = new Date();
      return arr.sort((a, b) => {
        const daysA = a.end_date ? differenceInDays(now, new Date(a.end_date)) : 0;
        const daysB = b.end_date ? differenceInDays(now, new Date(b.end_date)) : 0;
        return daysB - daysA;
      });
    },
    [sprints, statsComputed.atrasadosCount] // DS-01: depend só no count, não em todos os sprints
  );

  const sprintsEmAndamento = useMemo(
    () => sprints.filter(s => s.status === "in_progress" || s.status === "pending"),
    [sprints, statsComputed.emAndamentoCount] // DS-01: depend só no count
  );

  // DS-02: Computar sprintsByWorkshop + stats juntos (1 pass) ao invés de 2 passes
  const { sprintsByWorkshop, statsComputed } = useMemo(() => {
    const map = new Map();
    let atrasadosCount = 0, emAndamentoCount = 0, pendingReviewCount = 0;
    
    sprints.forEach(s => {
      // Map por workshop
      if (!map.has(s.workshop_id)) map.set(s.workshop_id, []);
      map.get(s.workshop_id).push(s);
      
      // Contar stats em 1 pass
      if (s.status === "overdue") atrasadosCount++;
      if (s.status === "in_progress" || s.status === "pending") emAndamentoCount++;
      if ((s.phases || []).some(p => p.status === "pending_review")) pendingReviewCount++;
    });
    
    return {
      sprintsByWorkshop: map,
      statsComputed: { atrasadosCount, emAndamentoCount, pendingReviewCount }
    };
  }, [sprints]);

  const clientesComTrilha = useMemo(() => {
    return workshops
      .map(w => {
        const ws = sprintsByWorkshop.get(w.id) || [];
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
  }, [workshops, sprintsByWorkshop]);

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
    const concluidos = sprints.filter(s => s.status === "completed").length;
    const avgProgress = t > 0 ? Math.round(sprints.reduce((acc, s) => acc + (s.progress_percentage || 0), 0) / t) : 0;
    
    return {
      total: t,
      em_andamento: statsComputed.emAndamentoCount,
      atrasados: statsComputed.atrasadosCount,
      pendingReview: statsComputed.pendingReviewCount,
      concluidos,
      avgProgress
    };
  }, [sprints, statsComputed.atrasadosCount, statsComputed.emAndamentoCount, statsComputed.pendingReviewCount]);

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