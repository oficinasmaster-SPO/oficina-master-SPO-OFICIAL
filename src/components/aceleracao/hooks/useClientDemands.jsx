import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isValidWorkshopId } from '@/lib/workshopIdGuard';

const EMPTY_DEMANDS = {
  sprints: [],
  pedidosInternos: [],
  backlogTarefas: [],
  cronogramaItems: [],
};

const EMPTY_SUMMARY = { totalDemands: 0, criticalCount: 0 };

/**
 * Hook para gerenciar demandas paralelas de um cliente.
 *
 * P2 (2026-07-29): migrado de fetch cru + setInterval manual para useQuery.
 *  - Cache + dedup automáticos: múltiplos mounts (ex: botão Suporte abrindo
 *    vários componentes ao mesmo tempo) colapsam N GETs idênticos em 1
 *    (causa-raiz da tempestade de 429 ao clicar em Suporte).
 *  - refetchInterval só roda com o modal aberto (isOpen=true).
 *  - Guarda isValidWorkshopId evita 404 em IDs de teste (ex: "test-workshop-task1").
 *
 * @param {string} workshopId
 * @param {string} followUpType
 * @param {boolean} isOpen — se o modal consumidor está aberto (controla o refetch periódico)
 */
export function useClientDemands(workshopId, followUpType, isOpen = false) {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['client-demands', workshopId, followUpType || 'ata'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getClientParallelDemands', {
        workshop_id: workshopId,
        follow_up_type: followUpType || 'ata',
      });

      if (!response || !response.data) {
        console.warn('Invalid response from getClientParallelDemands:', response);
        return { ...EMPTY_DEMANDS, summary: EMPTY_SUMMARY };
      }

      const {
        sprints = [],
        pedidosInternos = [],
        backlogTarefas = [],
        cronogramaItems = [],
        summary = {},
      } = response.data;

      return {
        sprints: Array.isArray(sprints) ? sprints : [],
        pedidosInternos: Array.isArray(pedidosInternos) ? pedidosInternos : [],
        backlogTarefas: Array.isArray(backlogTarefas) ? backlogTarefas : [],
        cronogramaItems: Array.isArray(cronogramaItems) ? cronogramaItems : [],
        summary: {
          totalDemands: summary.totalDemands || 0,
          criticalCount: summary.criticalCount || 0,
        },
      };
    },
    enabled: isValidWorkshopId(workshopId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: isOpen ? 30 * 1000 : false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const demands = useMemo(
    () => ({
      sprints: data?.sprints || [],
      pedidosInternos: data?.pedidosInternos || [],
      backlogTarefas: data?.backlogTarefas || [],
      cronogramaItems: data?.cronogramaItems || [],
    }),
    [data],
  );

  const summary = data?.summary || EMPTY_SUMMARY;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const getCriticalCount = useCallback(() => {
    const all = [
      ...demands.sprints,
      ...demands.pedidosInternos,
      ...demands.backlogTarefas,
      ...demands.cronogramaItems,
    ];
    return all.filter((d) => d.severity === 'RED').length;
  }, [demands]);

  const getDemandsByType = useCallback(
    (type) => {
      const typeMap = {
        sprint: demands.sprints,
        pedido: demands.pedidosInternos,
        tarefa: demands.backlogTarefas,
        cronograma: demands.cronogramaItems,
      };
      return typeMap[type] || [];
    },
    [demands],
  );

  const getCriticalByType = useCallback(
    (type) => getDemandsByType(type).filter((d) => d.severity === 'RED').length,
    [getDemandsByType],
  );

  const hasAnyRed = useCallback(() => getCriticalCount() > 0, [getCriticalCount]);

  const demandsCritical = useMemo(
    () =>
      demands.sprints
        .filter((d) => d.severity === 'RED')
        .concat(
          demands.pedidosInternos.filter((d) => d.severity === 'RED'),
          demands.backlogTarefas.filter((d) => d.severity === 'RED'),
          demands.cronogramaItems.filter((d) => d.severity === 'RED'),
        ),
    [demands],
  );

  return {
    // Dados
    demands,
    sprints: demands.sprints,
    pedidosInternos: demands.pedidosInternos,
    backlogTarefas: demands.backlogTarefas,
    cronogramaItems: demands.cronogramaItems,

    // Status
    loading: isLoading,
    error: error ? error.message : null,
    lastUpdated,
    summary,

    // Helpers
    refetch,
    getCriticalCount,
    getDemandsByType,
    getCriticalByType,
    hasAnyRed,
    demandsCritical,
  };
}