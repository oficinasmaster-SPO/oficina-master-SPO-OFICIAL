import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";

export default function useDashboardSprints(workshops = [], user = null, consultingFirmId = null) {
  const queryClient = useQueryClient();
  const workshopIds = useMemo(() => workshops.map(w => w.id), [workshops]);
  const workshopIdsKey = workshopIds.join(',');

  // DS-SINGLE-02: consultingFirmId vem direto do BFF (via useWorkshopContext → getUserWorkshops)
  // Fallbacks adicionais caso não seja passado explicitamente
  const resolvedFirmId = useMemo(() => {
    if (consultingFirmId) return consultingFirmId;
    if (user?.data?.consulting_firm_id) return user.data.consulting_firm_id;
    const ws = workshops.find(w => w.consulting_firm_id);
    return ws?.consulting_firm_id || null;
  }, [consultingFirmId, user, workshops]);

  const { data: sprints = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-sprints', resolvedFirmId, workshopIdsKey],
    queryFn: async () => {
      try {
        // CAMINHO 1 (preferencial): 1 request por consulting_firm_id
        if (resolvedFirmId) {
          console.log(`[useDashboardSprints] Buscando por consulting_firm_id: ${resolvedFirmId}`);
          const sprintsByFirm = await base44.entities.ConsultoriaSprint
            .filter({ consulting_firm_id: resolvedFirmId })
            .catch(err => {
              console.warn('[useDashboardSprints] Erro na query por consulting_firm_id:', err.message);
              return null;
            });

          if (sprintsByFirm !== null) {
            console.log(`[useDashboardSprints] ${sprintsByFirm.length} sprints carregados via consulting_firm_id`);
            return sprintsByFirm;
          }
        }

        // CAMINHO 2 (fallback): buscar por workshop_id individualmente
        const ids = workshopIdsKey.split(',').filter(Boolean);
        if (!ids.length) {
          console.warn('[useDashboardSprints] Sem consulting_firm_id e sem workshops — retornando []');
          return [];
        }

        console.log(`[useDashboardSprints] Fallback: buscando por ${ids.length} workshop_ids`);
        const batchSize = 5;
        const allSprints = [];
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(id =>
              base44.entities.ConsultoriaSprint
                .filter({ workshop_id: id })
                .catch(() => [])
            )
          );
          results.forEach(arr => { if (Array.isArray(arr)) allSprints.push(...arr); });
          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        return allSprints;
      } catch (error) {
        console.error('[useDashboardSprints] Erro crítico:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
    // Aguardar até ter resolvedFirmId OU lista de workshops carregada (não vazia)
    enabled: !!resolvedFirmId || workshopIds.length > 0,
    placeholderData: (prev) => prev || []
  });

  useEffect(() => {
    let debounceTimer;
    let refetchPending = false;
    const idSet = new Set(workshopIdsKey.split(',').filter(Boolean));

    const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
      const eventFirmId = event.data?.consulting_firm_id;
      const eventWorkshopId = event.data?.workshop_id;
      const isRelevant = (resolvedFirmId && eventFirmId === resolvedFirmId) ||
                         (eventWorkshopId && idSet.has(eventWorkshopId));

      if (!isRelevant || refetchPending) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refetchPending = true;
        queryClient.invalidateQueries({ queryKey: ['dashboard-sprints', resolvedFirmId, workshopIdsKey] });
        queryClient.invalidateQueries({ queryKey: ['active-sprint-widget'] });
        setTimeout(() => { refetchPending = false; }, 1000);
      }, 500);
    });

    return () => {
      clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [resolvedFirmId, workshopIdsKey, queryClient]);

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
    // Inclui "in_progress" e "pending" — ambos representam sprints ativos no pipeline
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
    // Itera sobre TODOS os workshop_ids que têm sprints, não apenas os da lista de workshops
    // Isso garante que workshops presentes nos sprints mas não na lista ainda apareçam
    const result = [];
    sprintsByWorkshop.forEach((ws, workshopId) => {
      if (!ws.length || !workshopId) return;
      const workshop = workshopMap[workshopId] || { id: workshopId, name: `Oficina ${workshopId.slice(0, 8)}...` };
      const avg = Math.round(ws.reduce((a, s) => a + (s.progress_percentage || 0), 0) / ws.length);
      const hasOverdue = ws.some(s => s.status === "overdue");
      const hasInProgress = ws.some(s => s.status === "in_progress");
      const pendingCount = ws.filter(s => s.status === "pending").length;
      const hasPending = pendingCount > 0;
      result.push({ workshop, sprints: ws, avgProgress: avg, hasOverdue, hasInProgress, hasPending, pendingCount });
    });
    return result.sort((a, b) => b.sprints.length - a.sprints.length);
  }, [sprintsByWorkshop, workshopMap]);

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
        // S05: Validar se workshop existe antes de acessar
        const workshop = workshopMap[sprint.workshop_id];
        if (!workshop) return null;
        return { sprint, pendingPhases, workshop };
      })
      .filter(Boolean);
  }, [sprints, workshopMap]);

  const stats = useMemo(() => {
    const t = sprints.length;
    return {
      total: t,
      em_andamento: sprintsEmAndamento.length, // inclui pending + in_progress
      atrasados: sprintsAtrasados.length,
      pendingReview: sprintsPendingReview.length,
      concluidos: sprintsConcluidos.length,
      avgProgress: t > 0 ? Math.round(sprints.reduce((acc, s) => acc + (s.progress_percentage || 0), 0) / t) : 0
    };
  }, [sprints, sprintsEmAndamento, sprintsAtrasados, sprintsPendingReview, sprintsConcluidos]);

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