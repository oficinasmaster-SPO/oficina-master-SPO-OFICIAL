import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users,
  Edit3,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function GlobalGoalsIndicator({ workshop, className = "" }) {
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Buscar dados de metas do workshop
  const { data: workshopData, isLoading: loadingWorkshop } = useQuery({
    queryKey: ['workshop-goals', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return null;
      const ws = await base44.entities.Workshop.filter({ id: workshop.id });
      return ws?.[0] || null;
    },
    enabled: !!workshop?.id
  });

  // Buscar registros de metas mensais realizadas
  const { data: monthlyHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['monthly-goal-history', workshop?.id, currentMonth],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const history = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id: workshop.id,
        entity_type: "workshop",
        month: currentMonth
      });
      return history || [];
    },
    enabled: !!workshop?.id
  });

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return '0';
    return value.toLocaleString('pt-BR');
  };

  if (loadingWorkshop || loadingHistory) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  // Dados projetados (meta do mês)
  const monthlyGoals = workshopData?.monthly_goals || {};
  const projectedRevenue = monthlyGoals.projected_revenue || 0;
  const projectedCustomers = monthlyGoals.customer_volume || 0;
  const projectedParts = monthlyGoals.revenue_parts || 0;
  const projectedServices = monthlyGoals.revenue_services || 0;

  // Dados realizados (acumulado do mês)
  const totalAchieved = monthlyHistory.reduce((sum, record) => 
    sum + (record.revenue_total || 0), 0
  );
  const totalCustomers = monthlyHistory.reduce((sum, record) => 
    sum + (record.customer_volume || 0), 0
  );
  const totalParts = monthlyHistory.reduce((sum, record) => 
    sum + (record.revenue_parts || 0), 0
  );
  const totalServices = monthlyHistory.reduce((sum, record) => 
    sum + (record.revenue_services || 0), 0
  );

  // Cálculos de progresso
  const revenueProgress = projectedRevenue > 0 
    ? Math.min((totalAchieved / projectedRevenue) * 100, 100) 
    : 0;
  const customersProgress = projectedCustomers > 0
    ? Math.min((totalCustomers / projectedCustomers) * 100, 100)
    : 0;

  const revenueGap = projectedRevenue - totalAchieved;
  const customersGap = projectedCustomers - totalCustomers;

  const averageTicket = totalCustomers > 0 
    ? totalAchieved / totalCustomers 
    : 0;

  const hasProjection = projectedRevenue > 0;

  if (!hasProjection) {
    return (
      <Card className={`border-dashed border-2 ${className}`}>
        <CardContent className="py-12 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Metas não configuradas
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Configure as metas mensais da oficina para acompanhar o desempenho em tempo real
          </p>
          <Link to={createPageUrl("GestaoOficina")}>
            <Button>
              <Edit3 className="w-4 h-4 mr-2" />
              Configurar Metas
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (progress) => {
    if (progress >= 90) return "bg-green-600";
    if (progress >= 70) return "bg-yellow-500";
    if (progress >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getProgressStatus = (progress) => {
    if (progress >= 100) return { 
      icon: CheckCircle, 
      text: "Meta batida!", 
      color: "text-green-600" 
    };
    if (progress >= 90) return { 
      icon: TrendingUp, 
      text: "Quase lá", 
      color: "text-green-600" 
    };
    if (progress >= 70) return { 
      icon: TrendingUp, 
      text: "No caminho certo", 
      color: "text-yellow-600" 
    };
    return { 
      icon: AlertCircle, 
      text: "Atenção necessária", 
      color: "text-orange-600" 
    };
  };

  const revenueStatus = getProgressStatus(revenueProgress);
  const RevenueIcon = revenueStatus.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Metas Globais do Mês
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {new Date(currentMonth + '-01').toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Badge>
            <Link to={createPageUrl("PainelMetas")}>
              <Button variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indicador Principal - Faturamento Total */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Faturamento Total</span>
            </div>
            <div className="flex items-center gap-2">
              <RevenueIcon className={`w-5 h-5 ${revenueStatus.color}`} />
              <span className={`text-sm font-semibold ${revenueStatus.color}`}>
                {revenueStatus.text}
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalAchieved)}
              </p>
              <p className="text-sm text-gray-500">
                de {formatCurrency(projectedRevenue)} (meta)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {revenueProgress.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Progresso</p>
            </div>
          </div>

          <Progress 
            value={revenueProgress} 
            className="h-3 mb-2"
            indicatorClassName={getProgressColor(revenueProgress)}
          />

          {revenueGap > 0 && (
            <p className="text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Faltam <strong>{formatCurrency(revenueGap)}</strong> para bater a meta
            </p>
          )}
        </div>

        {/* Indicadores Secundários */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Peças */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-sm font-medium text-gray-700">Peças</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totalParts)}
            </p>
            <p className="text-xs text-gray-500">
              Meta: {formatCurrency(projectedParts)}
            </p>
            {projectedParts > 0 && (
              <Progress 
                value={Math.min((totalParts / projectedParts) * 100, 100)}
                className="h-2 mt-2"
                indicatorClassName="bg-green-600"
              />
            )}
          </div>

          {/* Serviços */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-purple-600" />
              <span className="text-sm font-medium text-gray-700">Serviços</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totalServices)}
            </p>
            <p className="text-xs text-gray-500">
              Meta: {formatCurrency(projectedServices)}
            </p>
            {projectedServices > 0 && (
              <Progress 
                value={Math.min((totalServices / projectedServices) * 100, 100)}
                className="h-2 mt-2"
                indicatorClassName="bg-purple-600"
              />
            )}
          </div>

          {/* Clientes */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Clientes</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(totalCustomers)}
            </p>
            <p className="text-xs text-gray-500">
              Meta: {formatNumber(projectedCustomers)}
            </p>
            {projectedCustomers > 0 && (
              <>
                <Progress 
                  value={customersProgress}
                  className="h-2 mt-2"
                  indicatorClassName={getProgressColor(customersProgress)}
                />
                {customersGap > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Faltam {customersGap} clientes
                  </p>
                )}
              </>
            )}
          </div>

          {/* Ticket Médio */}
          <div className="bg-cyan-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-cyan-600" />
              <span className="text-sm font-medium text-gray-700">Ticket Médio</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(averageTicket)}
            </p>
            <p className="text-xs text-gray-500">
              Realizado
            </p>
          </div>
        </div>

        {/* Resumo */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            {monthlyHistory.length} registro(s) no mês
          </p>
          <Link to={createPageUrl("PainelMetas")}>
            <Button variant="link" size="sm" className="text-blue-600">
              Ver detalhes →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}