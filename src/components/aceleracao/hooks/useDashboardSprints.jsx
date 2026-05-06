import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";

/**
 * DS-FIX-C: Arquitetura melhorada.
 * Quando o usuário tem consulting_firm_id, busca sprints diretamente por esse campo
 * com 1 único request — elimina dependência da lista completa de workshops.
 * Fallback: busca por workshop_id (comportamento original) para usuários sem firm_id.
 */
export default function useDashboardSprints(workshops = [], user = null) {
  const queryClient = useQueryClient();
  const workshopIds = useMemo(() => workshops.map(w => w.id), [workshops]);
  const workshopIdsKey = workshopIds.join(',');

  // DS-FIX-C-URGENTE: ler consulting_firm_id do user.data — independente do estado de workshops
  const consultingFirmId = user?.data?.consulting_firm_id ||
    workshops.find(w => w.consulting_firm_id)?.consulting_firm_id ||
    null;

  const { data: sprints = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-sprints', consultingFirmId || workshopIdsKey],
    queryFn: async () => {
      try {
        // DS-FIX-C1: Se temos consulting_firm_id, buscar todos os sprints da firma de uma vez
        if (consultingFirmId) {
          console.log(`[useDashboardSprints] DS-FIX-C: Buscando sprints por consulting_firm_id=${consultingFirmId}`);
          const allSprints = await base44.entities.ConsultoriaSprint
            .filter({ consulting_firm_id: consultingFirmId }, '-updated_date', 1000)
            .catch(err => {
              console.warn('[useDashboardSprints] Falha ao buscar por consulting_firm_id, fallback para workshop_ids:', err.message);
              return null; // null = fallback
            });

          if (allSprints !== null) {
            const statusCounts = allSprints.reduce((acc, s) => {
              acc[s.status || 'sem_status'] = (acc[s.status || 'sem_status'] || 0) + 1;
              return acc;
            }, {});
            console.log(`[useDashboardSprints] DS-FIX-C: ${allSprints.length} sprints carregados por firm_id. Status:`, statusCounts);
            return allSprints;
          }
        }

        // DS-FIX-C2: Fallback — busca por workshop_id (comportamento original)
        const ids = workshopIdsKey.split(',').filter(Boolean);
        if (!ids.length) return [];
        console.log(`[useDashboardSprints] Fallback: Buscando sprints para ${ids.length} workshops`);
        
        const batchSize = 5;
        const allSprints = [];
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(id =>
              base44.entities.ConsultoriaSprint
                .filter({ workshop_id: id })
                .catch(err => {
                  console.warn(`[Sprint Fetch] Erro ao buscar sprint para workshop ${id}:`, err.message);
                  return [];
                })
            )
          );
          results.forEach(arr => {
            if (Array.isArray(arr)) allSprints.push(...arr);
          });
          if (i + batchSize < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        const statusCounts = allSprints.reduce((acc, s) => {
          acc[s.status || 'sem_status'] = (acc[s.status || 'sem_status'] || 0) + 1;
          return acc;
        }, {});
        console.log(`[useDashboardSprints] ${allSprints.length} sprints carregados. Status:`, statusCounts);
        
        return allSprints;
      } catch (error) {
        console.error('[useDashboardSprints] Erro crítico ao buscar sprints:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
    enabled: consultingFirmId != null || workshopIds.length > 0,
    placeholderData: []
  });

  // Subscribe em tempo real: invalida cache quando qualquer sprint relevante muda
  useEffect(() => {
    const ids = workshopIdsKey.split(',').filter(Boolean);
    // DS-FIX-C3: se temos firm_id, qualquer sprint dela é relevante — não filtrar por workshop_id
    const usesFirmId = !!consultingFirmId;
    if (!usesFirmId && !ids.length) return;
    
    const idSet = new Set(ids);
    let debounceTimer;
    let refetchPending = false;
    
    const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
      const isRelevant = usesFirmId
        ? (event.data?.consulting_firm_id === consultingFirmId || event.data?.workshop_id)
        : (event.data?.workshop_id && idSet.has(event.data.workshop_id));
      if (isRelevant) {
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
  }, [workshopIdsKey, consultingFirmId, queryClient]);

  // DS-NAME-01: detectar workshops dos sprints que não estão na prop workshops[]
  const baseWorkshopMap = useMemo(
    () => Object.fromEntries(workshops.map(w => [w.id, w])),
    [workshops]
  );

  const missingSprintWorkshopIds = useMemo(() => {
    const missing = new Set();
    sprints.forEach(s => {
      if (s.workshop_id && !baseWorkshopMap[s.workshop_id]) {
        missing.add(s.workshop_id);
      }
    });
    return Array.from(missing);
  }, [sprints, baseWorkshopMap]);

  // Buscar workshops faltantes em batch via BFF (asServiceRole — sem RLS)
  const { data: extraWorkshops = [] } = useQuery({
    queryKey: ['dashboard-missing-workshops', missingSprintWorkshopIds.join(',')],
    queryFn: async () => {
      if (!missingSprintWorkshopIds.length) return [];
      try {
        const response = await base44.functions.invoke('getUserWorkshops', {
          workshopIds: missingSprintWorkshopIds
        });
        return response?.data?.workshops || [];
      } catch (err) {
        console.warn('[useDashboardSprints] Falha ao buscar workshops faltantes:', err?.message);
        return [];
      }
    },
    enabled: missingSprintWorkshopIds.length > 0,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // workshopMap final: base + extras dos sprints
  const workshopMap = useMemo(() => {
    const map = { ...baseWorkshopMap };
    extraWorkshops.forEach(w => { if (w?.id) map[w.id] = w; });
    return map;
  }, [baseWorkshopMap, extraWorkshops]);

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