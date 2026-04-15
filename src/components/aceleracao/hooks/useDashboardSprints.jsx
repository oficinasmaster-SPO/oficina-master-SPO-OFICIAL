import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";

export default function useDashboardSprints(workshops = []) {
  const workshopIds = useMemo(() => workshops.map(w => w.id), [workshops]);

  const { data: sprints = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-sprints', workshopIds],
    queryFn: () => base44.entities.ConsultoriaSprint.filter({ workshop_id: { $in: workshopIds } }),
    staleTime: 2 * 60 * 1000,
    enabled: workshopIds.length > 0
  });

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
    () => sprints.filter(s => s.status === "in_progress"),
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

  const stats = useMemo(() => {
    const t = sprints.length;
    return {
      total: t,
      em_andamento: sprintsEmAndamento.length,
      atrasados: sprintsAtrasados.length,
      concluidos: sprints.filter(s => s.status === "completed").length,
      avgProgress: t > 0 ? Math.round(sprints.reduce((acc, s) => acc + (s.progress_percentage || 0), 0) / t) : 0
    };
  }, [sprints, sprintsEmAndamento, sprintsAtrasados]);

  return {
    sprints,
    sprintsAtrasados,
    sprintsEmAndamento,
    clientesComTrilha,
    workshopMap,
    stats,
    isLoading,
    refetch
  };
}