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
        
        // FIX #4: Paralelizar batching (ao invés de sequencial)
        // Cria promises para todos os batches em paralelo
        const batchSize = 3;
        const batches = [];
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          batches.push(
            Promise.all(
              batch.map(id => 
                base44.entities.ConsultoriaSprint
                  .filter({ workshop_id: id })
                  .catch(err => {
                    console.warn(`[Sprint Fetch] Erro ao buscar sprint para workshop ${id}:`, err.message);
                    return [];
                  })
              )
            )
          );
        }
        
        // Aguarda todos os batches em paralelo (não sequencial)
        const batchResults = await Promise.all(batches);
        return batchResults.flat().flat();
      } catch (error) {
        console.error('[useDashboardSprints] Erro crítico ao buscar sprints:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
    enabled: workshopIds.length > 0,
    // FIX: Usar initialData ao invés de placeholderData para preservar dados durante transição
    initialData: []
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

  // FIX #5: Cache com Map para evitar O(n²) filter
  const sprintsByWorkshop = useMemo(() => {
    const map = new Map();
    sprints.forEach(s => {
      if (!map.has(s.workshop_id)) map.set(s.workshop_id, []);
      map.get(s.workshop_id).push(s);
    });
    return map;
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