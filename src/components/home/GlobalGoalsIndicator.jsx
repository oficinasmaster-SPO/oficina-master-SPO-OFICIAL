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
import StatusMetaBadge from "@/components/historico/StatusMetaBadge";
import FeedbackMetaModal from "@/components/historico/FeedbackMetaModal";

export default function GlobalGoalsIndicator({ workshop, className = "" }) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [feedbackModal, setFeedbackModal] = React.useState({ 
    open: false, 
    status: "", 
    metricName: "", 
    realizado: 0, 
    meta: 0 
  });

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

  // Dados de configuração
  const bestMonthHistory = workshopData?.best_month_history || {};
  const monthlyGoals = workshopData?.monthly_goals || {};
  const growthPercentage = monthlyGoals.growth_percentage || 10;
  
  // PROJETADO - calculado baseado no melhor mês + crescimento
  const bestMonthRevenue = bestMonthHistory.revenue_total || 0;
  const projectedRevenue = bestMonthRevenue > 0 
    ? bestMonthRevenue * (1 + growthPercentage / 100)
    : 0;
  const projectedParts = (bestMonthHistory.revenue_parts || 0) * (1 + growthPercentage / 100);
  const projectedServices = (bestMonthHistory.revenue_services || 0) * (1 + growthPercentage / 100);
  const projectedCustomers = Math.round((bestMonthHistory.customer_volume || 0) * (1 + growthPercentage / 100));

  // REALIZADO - vem de workshop.monthly_goals (atualizado pelos registros manuais no PainelMetas)
  const totalAchieved = monthlyGoals.actual_revenue_achieved || 0;
  const totalParts = monthlyGoals.revenue_parts || 0;
  const totalServices = monthlyGoals.revenue_services || 0;
  const totalCustomers = monthlyGoals.customer_volume || 0;

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

  // Calcular dias úteis do mês até hoje para meta acumulada
  const calcularDiasUteis = (mesAno) => {
    const [ano, mes] = mesAno.split('-').map(Number);
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    let diasUteis = 0;

    for (let dia = primeiroDia.getDate(); dia <= ultimoDia.getDate(); dia++) {
      const data = new Date(ano, mes - 1, dia);
      const diaSemana = data.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasUteis++;
      }
    }
    return diasUteis;
  };

  const hoje = new Date();
  const diasUteisMes = calcularDiasUteis(currentMonth);
  
  let diasUteisDecorridos = 0;
  const [anoFiltro, mesFiltro] = currentMonth.split('-').map(Number);
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  if (anoFiltro === anoAtual && mesFiltro === mesAtual) {
    for (let dia = 1; dia <= hoje.getDate(); dia++) {
      const data = new Date(anoAtual, mesAtual - 1, dia);
      const diaSemana = data.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasUteisDecorridos++;
      }
    }
  } else {
    diasUteisDecorridos = diasUteisMes;
  }

  // Meta acumulada até o dia atual
  const metaAcumuladaRevenue = diasUteisMes > 0 ? (projectedRevenue / diasUteisMes) * diasUteisDecorridos : 0;
  const metaAcumuladaCustomers = diasUteisMes > 0 ? Math.round((projectedCustomers / diasUteisMes) * diasUteisDecorridos) : 0;

  // Função para determinar status baseado em IRM
  const getStatus = (realizado, meta) => {
    const irm = meta > 0 ? realizado / meta : 0;
    if (irm > 1.05) return "acima";
    if (irm >= 0.95) return "na_media";
    return "abaixo";
  };

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
            <StatusMetaBadge
              realizadoAcumulado={totalAchieved}
              metaAcumulada={metaAcumuladaRevenue}
              onClick={() => setFeedbackModal({
                open: true,
                status: getStatus(totalAchieved, metaAcumuladaRevenue),
                metricName: "Faturamento Total",
                realizado: totalAchieved,
                meta: metaAcumuladaRevenue
              })}
            />
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
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Clientes</span>
              </div>
              <div onClick={() => setFeedbackModal({
                open: true,
                status: getStatus(totalCustomers, metaAcumuladaCustomers),
                metricName: "Clientes",
                realizado: totalCustomers,
                meta: metaAcumuladaCustomers
              })}>
                <StatusMetaBadge
                  realizadoAcumulado={totalCustomers}
                  metaAcumulada={metaAcumuladaCustomers}
                  onClick={() => {}}
                />
              </div>
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

      <FeedbackMetaModal
        open={feedbackModal.open}
        onClose={() => setFeedbackModal({ ...feedbackModal, open: false })}
        status={feedbackModal.status}
        metricName={feedbackModal.metricName}
        realizadoAcumulado={feedbackModal.realizado}
        metaAcumulada={feedbackModal.meta}
      />
    </Card>
  );
}