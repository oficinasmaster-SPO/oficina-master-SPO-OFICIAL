import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para gerenciar demandas paralelas de um cliente
 * Auto-refresh a cada 30s enquanto modal está aberto
 * Detecta mudanças em tempo real
 */
export function useClientDemands(workshopId, followUpType, isOpen = false) {
  const [demands, setDemands] = useState({
    sprints: [],
    pedidosInternos: [],
    backlogTarefas: [],
    cronogramaItems: []
  });
  const [summary, setSummary] = useState({
    totalDemands: 0,
    criticalCount: 0
  });
  const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [lastUpdated, setLastUpdated] = useState(null);

   // Debounce ref para evitar rate limit
   const fetchTimeoutRef = useRef(null);
   const lastFetchRef = useRef(null);
   const MIN_FETCH_INTERVAL = 2000; // 2s entre fetches

   // Função para buscar demands COM debounce
   const fetchDemands = useCallback(async () => {
     if (!workshopId) {
       setDemands({
         sprints: [],
         pedidosInternos: [],
         backlogTarefas: [],
         cronogramaItems: []
       });
       return;
     }

     // ✅ EVITAR RATE LIMIT: Check min interval
     const now = Date.now();
     if (lastFetchRef.current && now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
       return;
     }

     // ✅ Limpar timeout anterior
     if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

     try {
       setLoading(true);
       setError(null);
       lastFetchRef.current = Date.now();

       const response = await base44.functions.invoke('getClientParallelDemands', {
         workshop_id: workshopId,
         follow_up_type: followUpType || 'ata'
       });

       if (response && response.data) {
         const { sprints = [], pedidosInternos = [], backlogTarefas = [], cronogramaItems = [], summary = {} } = response.data;

         setDemands({
           sprints: Array.isArray(sprints) ? sprints : [],
           pedidosInternos: Array.isArray(pedidosInternos) ? pedidosInternos : [],
           backlogTarefas: Array.isArray(backlogTarefas) ? backlogTarefas : [],
           cronogramaItems: Array.isArray(cronogramaItems) ? cronogramaItems : []
         });

         setSummary({
           totalDemands: summary.totalDemands || 0,
           criticalCount: summary.criticalCount || 0
         });
         setLastUpdated(new Date());
       } else {
         console.warn('Invalid response from getClientParallelDemands:', response);
       }
     } catch (err) {
       console.error('Error fetching client demands:', err);
       // ✅ Retry após 5s se rate limit
       if (err.status === 429) {
         fetchTimeoutRef.current = setTimeout(() => {
           lastFetchRef.current = null;
           fetchDemands();
         }, 5000);
       } else {
         setError(err.message);
       }
     } finally {
       setLoading(false);
     }
   }, [workshopId, followUpType]);

  // Fetch inicial (com debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDemands();
    }, 300);
    return () => clearTimeout(timer);
  }, [workshopId, followUpType]); // ✅ Depende de IDs, não de fetchDemands

  // Auto-refresh a cada 30s se modal está aberto
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchDemands();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [isOpen, fetchDemands]);

  // Helper para contar demands por severity
  const getCriticalCount = useCallback(() => {
    const allDemands = [
      ...demands.sprints,
      ...demands.pedidosInternos,
      ...demands.backlogTarefas,
      ...demands.cronogramaItems
    ];
    return allDemands.filter(d => d.severity === 'RED').length;
  }, [demands]);

  // Helper para contar demands por tipo
  const getDemandsByType = useCallback((type) => {
    const typeMap = {
      sprint: demands.sprints,
      pedido: demands.pedidosInternos,
      tarefa: demands.backlogTarefas,
      cronograma: demands.cronogramaItems
    };
    return typeMap[type] || [];
  }, [demands]);

  // Helper para contar demands críticos por tipo
  const getCriticalByType = useCallback((type) => {
    return getDemandsByType(type).filter(d => d.severity === 'RED').length;
  }, [getDemandsByType]);

  // Helper para verificar se há algo crítico
  const hasAnyRed = useCallback(() => {
    return getCriticalCount() > 0;
  }, [getCriticalCount]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  return {
    // Dados
    demands,
    sprints: demands.sprints,
    pedidosInternos: demands.pedidosInternos,
    backlogTarefas: demands.backlogTarefas,
    cronogramaItems: demands.cronogramaItems,

    // Status
    loading,
    error,
    lastUpdated,
    summary,

    // Helpers
    refetch: fetchDemands,
    getCriticalCount,
    getDemandsByType,
    getCriticalByType,
    hasAnyRed,
    demandsCritical: demands.sprints.filter(d => d.severity === 'RED').concat(
      demands.pedidosInternos.filter(d => d.severity === 'RED'),
      demands.backlogTarefas.filter(d => d.severity === 'RED'),
      demands.cronogramaItems.filter(d => d.severity === 'RED')
    )
  };
}