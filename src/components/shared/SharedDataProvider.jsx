import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const SharedDataContext = createContext(null);

export function SharedDataProvider({ children, workshopId, userId }) {
  const queryClient = useQueryClient();

  // FORÇA INVALIDAR tudo quando workshopId muda
  useEffect(() => {
    if (workshopId) {
      console.log('🔥 SharedDataProvider: workshopId mudou para:', workshopId);
      queryClient.invalidateQueries();
    }
  }, [workshopId, queryClient]);

  // Dados da Oficina - fonte principal
  const { data: workshop, isLoading: loadingWorkshop } = useQuery({
    queryKey: ['shared-workshop', workshopId],
    queryFn: async () => {
      if (!workshopId) return null;
      try {
        let ws = null;
        try {
          const wsList = await base44.entities.Workshop.filter({ id: workshopId });
          if (wsList && wsList.length > 0) ws = wsList[0];
        } catch(err) {
          console.warn("RLS bloqueou filter no SharedDataProvider, tentando fallback...");
        }
        
        if (!ws) {
          const response = await base44.functions.invoke('checkWorkshop', { workshop_id: workshopId });
          if (response.data && response.data.workshopFound) {
            ws = response.data.workshopData;
          }
        }
        
        if (!ws) throw new Error("Oficina não encontrada após fallback");

        console.log('📊 SharedDataProvider carregou workshop:', {
          id: ws.id,
          name: ws.name,
          city: ws.city,
          state: ws.state
        });
        return ws;
      } catch (error) {
        console.error("Erro ao carregar workshop:", error);
        return null;
      }
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: latestDRE, isLoading: loadingDRE } = useQuery({
    queryKey: ['shared-dre', workshopId],
    queryFn: async () => {
      if (!workshopId) return null;
      console.log('📊 Carregando DRE para:', workshopId);
      try {
        const dres = await base44.entities.DREMonthly.filter({ workshop_id: workshopId }, '-reference_month', 1);
        console.log('📊 DRE encontrado:', dres?.[0] ? 'sim' : 'não');
        return dres?.[0] || null;
      } catch (error) {
        console.error("Erro ao carregar DRE:", error);
        return null;
      }
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: latestOSDiagnostic, isLoading: loadingOS } = useQuery({
    queryKey: ['shared-os-diagnostic', workshopId],
    queryFn: async () => {
      if (!workshopId) return null;
      console.log('📊 Carregando OS Diagnostic para:', workshopId);
      try {
        const diagnostics = await base44.entities.ServiceOrderDiagnostic.filter({ workshop_id: workshopId }, '-created_date', 1);
        console.log('📊 OS encontrada:', diagnostics?.[0] ? 'sim' : 'não');
        return diagnostics?.[0] || null;
      } catch (error) {
        console.error("Erro ao carregar OS:", error);
        return null;
      }
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['shared-employees', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      console.log('📊 Carregando colaboradores para:', workshopId);
      try {
        const result = await base44.entities.Employee.filter({ workshop_id: workshopId });
        console.log('📊 Colaboradores encontrados:', result?.length || 0);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error("Erro ao carregar employees:", error);
        return [];
      }
    },
    enabled: !!workshopId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Metas mensais da oficina
  const { data: monthlyGoals, isLoading: loadingGoals } = useQuery({
    queryKey: ['shared-goals', workshopId],
    queryFn: async () => {
      if (!workshopId) return null;
      console.log('📊 Carregando metas para:', workshopId);
      const goals = await base44.entities.Goal.filter(
        { workshop_id: workshopId },
        '-created_date',
        1
      );
      const result = goals?.[0] || workshop?.monthly_goals || null;
      console.log('📊 Metas encontradas:', result ? 'sim' : 'não');
      return result;
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Histórico de metas
  const { data: goalsHistory = [], isLoading: loadingGoalsHistory } = useQuery({
    queryKey: ['shared-goals-history', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const history = await base44.entities.MonthlyGoalHistory.filter(
        { workshop_id: workshopId },
        '-month'
      );
      return Array.isArray(history) ? history : [];
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Função para invalidar e atualizar dados
  const refreshData = (dataType) => {
    const keyMap = {
      'workshop': ['shared-workshop', workshopId],
      'dre': ['shared-dre', workshopId],
      'tcmp2': ['shared-os-diagnostic', workshopId],
      'employees': ['shared-employees', workshopId],
      'goals': ['shared-goals', workshopId],
      'goalsHistory': ['shared-goals-history', workshopId],
      'all': null // invalida tudo
    };

    if (dataType === 'all') {
      Object.keys(keyMap).forEach(key => {
        if (key !== 'all' && keyMap[key]) {
          queryClient.invalidateQueries({ queryKey: keyMap[key] });
        }
      });
    } else if (keyMap[dataType]) {
      queryClient.invalidateQueries({ queryKey: keyMap[dataType] });
    }
  };

  // Dados financeiros consolidados do TCMP²
  const tcmp2Data = {
    // Do diagnóstico OS
    productive_technicians: latestOSDiagnostic?.productive_technicians || 0,
    monthly_hours: latestOSDiagnostic?.monthly_hours || 219,
    operational_costs: latestOSDiagnostic?.operational_costs || 0,
    people_costs: latestOSDiagnostic?.people_costs || 0,
    prolabore: latestOSDiagnostic?.prolabore || 0,
    ideal_hour_value: latestOSDiagnostic?.ideal_hour_value || 0,
    current_hour_value: latestOSDiagnostic?.current_hour_value || 0,
    investment_percentage: latestOSDiagnostic?.investment_percentage || 30,
    revenue_percentage: latestOSDiagnostic?.revenue_percentage || 70,
    
    // Do DRE
    revenue_total: latestDRE?.revenue_total || workshop?.best_month_history?.revenue_total || 0,
    revenue_parts: latestDRE?.revenue_parts || workshop?.best_month_history?.revenue_parts || 0,
    revenue_services: latestDRE?.revenue_services || workshop?.best_month_history?.revenue_services || 0,
    profit_percentage: latestDRE?.profit_percentage || workshop?.best_month_history?.profit_percentage || 0,
    rentability_percentage: latestDRE?.rentability_percentage || workshop?.best_month_history?.rentability_percentage || 0,
    average_ticket: latestDRE?.average_ticket || workshop?.best_month_history?.average_ticket || 0,
    customer_volume: latestDRE?.customer_volume || workshop?.best_month_history?.customer_volume || 0,
  };

  // Dados da oficina consolidados
  const workshopData = {
    id: workshop?.id,
    name: workshop?.name || '',
    city: workshop?.city || '',
    state: workshop?.state || '',
    segment: workshop?.segment || '',
    employees_count: workshop?.employees_count || employees.length || 0,
    vehicle_types: workshop?.vehicle_types || [],
    services_offered: workshop?.services_offered || [],
    tax_regime: workshop?.tax_regime || '',
    monthly_revenue: workshop?.monthly_revenue || '',
    capacidade_atendimento_dia: workshop?.capacidade_atendimento_dia || 0,
    tempo_medio_servico: workshop?.tempo_medio_servico || 0,
    horario_funcionamento: workshop?.horario_funcionamento || {},
  };

  // Metas consolidadas
  const goalsData = {
    month: monthlyGoals?.month || '',
    revenue_parts: monthlyGoals?.revenue_parts || 0,
    revenue_services: monthlyGoals?.revenue_services || 0,
    profitability_percentage: monthlyGoals?.profitability_percentage || 0,
    profit_percentage: monthlyGoals?.profit_percentage || 0,
    average_ticket: monthlyGoals?.average_ticket || 0,
    customer_volume: monthlyGoals?.customer_volume || 0,
    buy_target: monthlyGoals?.buy_target || 0,
  };

  const value = {
    // Dados brutos
    workshop,
    latestDRE,
    latestOSDiagnostic,
    employees,
    monthlyGoals,
    goalsHistory,
    
    // Dados consolidados para uso fácil
    tcmp2Data,
    workshopData,
    goalsData,
    
    // Estados de loading
    isLoading: loadingWorkshop || loadingDRE || loadingOS || loadingEmployees || loadingGoals,
    loadingStates: {
      workshop: loadingWorkshop,
      dre: loadingDRE,
      tcmp2: loadingOS,
      employees: loadingEmployees,
      goals: loadingGoals,
      goalsHistory: loadingGoalsHistory,
    },
    
    // Função para atualizar dados
    refreshData,
    
    // IDs para referência
    workshopId,
    userId,
  };

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useSharedData() {
  const context = useContext(SharedDataContext);
  if (!context) {
    // Retorna objeto vazio se não estiver dentro do provider
    return {
      workshop: null,
      latestDRE: null,
      latestOSDiagnostic: null,
      employees: [],
      monthlyGoals: null,
      goalsHistory: [],
      tcmp2Data: {},
      workshopData: {},
      goalsData: {},
      isLoading: false,
      loadingStates: {},
      refreshData: () => {},
      workshopId: null,
      userId: null,
    };
  }
  return context;
}

// Hook auxiliar para obter valor de uma fonte específica
export function useSharedValue(source, field, defaultValue = null) {
  const sharedData = useSharedData();
  
  const sourceMap = {
    'tcmp2': sharedData.tcmp2Data,
    'workshop': sharedData.workshopData,
    'goals': sharedData.goalsData,
    'dre': sharedData.latestDRE,
    'os': sharedData.latestOSDiagnostic,
  };

  const sourceData = sourceMap[source] || {};
  return sourceData[field] ?? defaultValue;
}