import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RevenueMetrics from "@/components/financial/RevenueMetrics";
import PaymentStatusTable from "@/components/financial/PaymentStatusTable";
import PlanPerformanceChart from "@/components/financial/PlanPerformanceChart";
import ConsultorPerformanceChart from "@/components/financial/ConsultorPerformanceChart";
import FinancialFilters from "@/components/financial/FinancialFilters";
import { Loader2 } from "lucide-react";

export default function DashboardFinanceiro() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["financial-metrics", dateRange],
    queryFn: async () => {
      const response = await base44.functions.invoke("getFinancialMetrics", dateRange);
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 60000
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Acesso restrito a administradores</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
        <p className="text-gray-600 mt-2">
          Visão geral de receitas, pagamentos e performance
        </p>
      </div>

      <FinancialFilters dateRange={dateRange} onDateRangeChange={setDateRange} />

      <RevenueMetrics metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlanPerformanceChart data={metrics?.planPerformance || []} />
        <ConsultorPerformanceChart data={metrics?.consultorPerformance || []} />
      </div>

      <PaymentStatusTable contracts={metrics?.contracts || []} />
    </div>
  );
}