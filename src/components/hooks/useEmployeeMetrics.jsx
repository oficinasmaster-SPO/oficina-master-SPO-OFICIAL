import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook centralizado para gerenciar métricas compartilhadas entre Produção e Metas
 * Garante que ambas as telas usem os mesmos dados base
 */
export const useEmployeeMetrics = (employee) => {
  const [bestMonthData, setBestMonthData] = useState(null);
  const [monthlyGoalsData, setMonthlyGoalsData] = useState(null);
  const [monthlyHistoryData, setMonthlyHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar dados consolidados do colaborador
  const loadMetrics = useCallback(async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      // 1. Melhor mês histórico (vem do Employee)
      const best = employee.best_month_history || {
        date: "",
        revenue_total: 0,
        revenue_parts: 0,
        revenue_services: 0,
        customer_volume: 0,
        average_ticket: 0
      };
      
      // 2. Metas mensais (vem do Employee.monthly_goals)
      const goals = employee.monthly_goals || {
        month: new Date().toISOString().substring(0, 7),
        individual_goal: 0,
        daily_projected_goal: 0,
        growth_percentage: 10,
        actual_revenue_achieved: 0,
        goals_by_service: []
      };

      // 3. Histórico mensal (vem do MonthlyGoalHistory)
      const currentMonth = new Date().toISOString().substring(0, 7);
      const historyRecords = await base44.entities.MonthlyGoalHistory.filter({
        employee_id: employee.id,
        month: currentMonth
      });
      
      const history = historyRecords && historyRecords.length > 0 
        ? historyRecords[0] 
        : null;

      setBestMonthData(best);
      setMonthlyGoalsData(goals);
      setMonthlyHistoryData(history);
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Calcular projeções baseadas no melhor mês
  const calculateProjections = useCallback((growthPercentage = 10) => {
    const bestRevenue = bestMonthData?.revenue_total || 0;
    const projectedMonthly = bestRevenue > 0 
      ? bestRevenue * (1 + growthPercentage / 100)
      : 0;
    const projectedDaily = projectedMonthly / 22;

    return {
      projectedMonthly,
      projectedDaily,
      bestRevenue
    };
  }, [bestMonthData]);

  // Atualizar melhor mês (sincroniza com Employee e ambas as telas)
  const updateBestMonth = useCallback(async (data) => {
    try {
      await base44.entities.Employee.update(employee.id, {
        best_month_history: data
      });
      setBestMonthData(data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar melhor mês:", error);
      return false;
    }
  }, [employee.id]);

  // Atualizar metas mensais (sincroniza com Employee)
  const updateMonthlyGoals = useCallback(async (data) => {
    try {
      await base44.entities.Employee.update(employee.id, {
        monthly_goals: data
      });
      setMonthlyGoalsData(data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar metas mensais:", error);
      return false;
    }
  }, [employee.id]);

  // Atualizar histórico mensal (sincroniza com MonthlyGoalHistory)
  const updateMonthlyHistory = useCallback(async (data) => {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      
      if (monthlyHistoryData?.id) {
        await base44.entities.MonthlyGoalHistory.update(monthlyHistoryData.id, data);
      } else {
        await base44.entities.MonthlyGoalHistory.create({
          workshop_id: employee.workshop_id,
          entity_type: "employee",
          entity_id: employee.id,
          employee_id: employee.id,
          month: currentMonth,
          ...data
        });
      }
      
      await loadMetrics(); // Recarregar para manter em sync
      return true;
    } catch (error) {
      console.error("Erro ao atualizar histórico:", error);
      return false;
    }
  }, [employee.id, employee.workshop_id, monthlyHistoryData?.id, loadMetrics]);

  return {
    bestMonthData,
    monthlyGoalsData,
    monthlyHistoryData,
    loading,
    calculateProjections,
    updateBestMonth,
    updateMonthlyGoals,
    updateMonthlyHistory,
    reload: loadMetrics
  };
};