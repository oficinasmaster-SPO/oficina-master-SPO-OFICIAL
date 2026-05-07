import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";
import { parseISO, isToday } from "date-fns";

/**
 * QUERY KEYS CENTRALIZADAS
 * Garantem invalidação consistente entre todos os componentes
 */
export const OPERATIONAL_QUERY_KEYS = {
  allFollowUps: (workshopId) => ['operational', 'followups', 'all', workshopId],
  completedFollowUps: (workshopId) => ['operational', 'followups', 'completed', workshopId],
  allSprints: (workshopId) => ['operational', 'sprints', 'all', workshopId],
  cronograma: (workshopId) => ['operational', 'cronograma', workshopId],
  backlogTasks: (workshopId) => ['operational', 'backlog', workshopId],
  internalRequests: (workshopId) => ['operational', 'requests', workshopId],
  atas: (workshopId) => ['operational', 'atas', workshopId],
  workshop: (workshopId) => ['operational', 'workshop', workshopId],
  workshopOwner: (ownerId) => ['operational', 'workshop', 'owner', ownerId],
  consultorAttendances: (consultorId, date) => ['operational', 'attendances', consultorId, date],
};

/**
 * Hook centralizado - FONTE ÚNICA DE VERDADE
 * Todos os componentes puxam dados daqui
 */
export function useOperationalSync(workshopId, consultorId, user) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // ─── FOLLOW-UPS ───
  const { data: allFollowUps = [], ...followUpsQuery } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.allFollowUps(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.FollowUpReminder.filter(
        { workshop_id: workshopId },
        "reminder_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 3 * 60 * 1000,
  });

  const { data: completedFollowUps = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.completedFollowUps(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.FollowUpConcluido.filter(
        { workshop_id: workshopId },
        "-completedAt",
        10
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── SPRINTS ───
  const { data: allSprints = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.allSprints(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId },
        "-start_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 4 * 60 * 1000,
  });

  // ─── CRONOGRAMA ───
  const { data: cronograma = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.cronograma(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshopId },
        "-created_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── BACKLOG ───
  const { data: backlogTasks = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.backlogTasks(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.TarefaBacklog.filter(
        { cliente_id: workshopId },
        "-created_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 4 * 60 * 1000,
  });

  // ─── PEDIDOS INTERNOS ───
  const { data: internalRequests = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.internalRequests(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.PedidoInterno.filter(
        { cliente_id: workshopId },
        "-created_date",
        30
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── ATAs ───
  const { data: atas = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.atas(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.MeetingMinutes.filter(
        { workshop_id: workshopId },
        "-meeting_date",
        30
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── WORKSHOP ───
  const { data: workshop } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.workshop(workshopId),
    queryFn: async () => {
      if (!workshopId) return null;
      const workshops = await base44.entities.Workshop.filter(
        { id: workshopId },
        undefined,
        1
      );
      return workshops[0] || null;
    },
    enabled: !!workshopId,
    staleTime: 10 * 60 * 1000,
  });

  // ─── WORKSHOP OWNER ───
  const { data: workshopOwner } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.workshopOwner(workshop?.owner_id),
    queryFn: async () => {
      if (!workshop?.owner_id) return null;
      const employees = await base44.entities.Employee.filter(
        { user_id: workshop.owner_id },
        undefined,
        1
      );
      return employees[0] || null;
    },
    enabled: !!workshop?.owner_id,
    staleTime: 10 * 60 * 1000,
  });

  // ─── CONSULTOR ATTENDANCES ───
  const { data: consultorAttendances = [] } = useQuery({
    queryKey: OPERATIONAL_QUERY_KEYS.consultorAttendances(consultorId, today),
    queryFn: async () => {
      if (!consultorId) return [];
      const todos = await base44.entities.ConsultoriaAtendimento.filter(
        { consultor_id: consultorId },
        "data_agendada",
        50
      );
      return todos.filter(a => {
        if (!a.data_agendada) return false;
        if (!['agendado', 'confirmado', 'reagendado'].includes(a.status))
          return false;
        try {
          return isToday(parseISO(a.data_agendada));
        } catch {
          return false;
        }
      });
    },
    enabled: !!consultorId,
    staleTime: 2 * 60 * 1000,
  });

  // ─── DERIVED DATA ─── (memoizado para performance)
  const derivedData = useMemo(() => {
    return {
      followUpsBySprintId: (sprintId) => allFollowUps.filter(
        f => f.origin_type === 'sprint' && f.sprint_id === sprintId
      ),
      sprintsInProgress: allSprints.filter(s => s.status === 'in_progress'),
      pendingBacklog: backlogTasks.filter(t => t.status === 'aberta'),
      pendingRequests: internalRequests.filter(r => r.status === 'pendente'),
      recentAtas: atas.slice(0, 5),
    };
  }, [allFollowUps, allSprints, backlogTasks, internalRequests, atas]);

  // ─── INVALIDATION HELPERS ───
  const invalidate = useMemo(() => ({
    followUps: () => {
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.allFollowUps(workshopId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.completedFollowUps(workshopId) 
      });
    },
    sprints: () => {
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.allSprints(workshopId) 
      });
    },
    cronograma: () => {
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.cronograma(workshopId) 
      });
    },
    backlog: () => {
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.backlogTasks(workshopId) 
      });
    },
    requests: () => {
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.internalRequests(workshopId) 
      });
    },
    atas: () => {
      queryClient.invalidateQueries({ 
        queryKey: OPERATIONAL_QUERY_KEYS.atas(workshopId) 
      });
    },
    all: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['operational'] 
      });
    },
  }), [workshopId, queryClient]);

  return {
    // Dados brutos
    allFollowUps,
    completedFollowUps,
    allSprints,
    cronograma,
    backlogTasks,
    internalRequests,
    atas,
    workshop,
    workshopOwner,
    consultorAttendances,

    // Derivações
    ...derivedData,

    // Status das queries
    isLoading: followUpsQuery.isLoading,

    // Invalidation helpers - USE PARA INVALIDAR DADOS
    invalidate,

    // Query keys (para invalidação manual se necessário)
    QUERY_KEYS: OPERATIONAL_QUERY_KEYS,
  };
}