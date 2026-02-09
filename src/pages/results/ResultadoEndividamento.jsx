import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, TrendingDown, AlertTriangle, CheckCircle2, FileText, DollarSign, Package, Briefcase, Sparkles } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoEndividamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const analysisId = urlParams.get("id");

      if (!analysisId) {
        toast.error("Análise não encontrada");
        navigate(createPageUrl("Home"));
        return;
      }

      const analyses = await base44.entities.DebtAnalysis.list();
      const current = analyses.find(a => a.id === analysisId);

      if (!current) {
        toast.error("Análise não encontrada");
        navigate(createPageUrl("Home"));
        return;
      }

      setAnalysis(current);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar análise");
    } finally {
      setLoading(false);
    }
  };

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', analysis.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: analysis.id,
        diagnostic_type: 'DebtAnalysis'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!analysis?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanDebt', { diagnostic_id: analysis.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', analysis.id]);
      toast.success('Plano gerado!');
    }
  });

  const refinePlanMutation = useMutation({
    mutationFn: async ({ feedback }) => base44.functions.invoke('refineActionPlan', {
      plan_id: actionPlan.id,
      feedback_content: feedback.content,
      feedback_type: feedback.type,
      audio_url: feedback.audio_url
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', analysis.id]);
      setShowFeedbackModal(false);
      toast.success('Plano refinado!');
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityIndex, status }) => {
      const updatedSchedule = [...actionPlan.plan_data.implementation_schedule];
      updatedSchedule[activityIndex].status = status;
      if (status === 'concluida') updatedSchedule[activityIndex].completed_date = new Date().toISOString();
      const completion = Math.round((updatedSchedule.filter(a => a.status === 'concluida').length / updatedSchedule.length) * 100);
      return await base44.entities.DiagnosticActionPlan.update(actionPlan.id, {
        plan_data: { ...actionPlan.plan_data, implementation_schedule: updatedSchedule },
        completion_percentage: completion
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', analysis.id]);
      toast.success('Atividade atualizada!');
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analysis) return null;

  // Dados para gráficos
  const curvaEndividamentoData = analysis.meses.map(m => ({
    mes: `Mês ${m.mes}`,
    comprometimento: m.comprometimento,
    dividas: m.dividas_total,
    receita: m.receita_prevista
  }));

  const custosPrevistos = analysis.meses.map(m => ({
    mes: `Mês ${m.mes}`,
    pecas: m.custo_previsto_pecas || 0,
    administrativo: m.custo_previsto_administrativo || 0,
    dividas: m.dividas_total
  }));

  const projecoesData = analysis.projecoes?.length > 0 
    ? analysis.projecoes.reduce((acc, p) => {
        const existing = acc.find(item => item.mes === `Mês ${p.mes}`);
        if (existing) {
          existing[p.cenario] = p.comprometimento_projetado;
        } else {
          acc.push({
            mes: `Mês ${p.mes}`,
            [p.cenario]: p.comprometimento_projetado
          });
        }
        return acc;
      }, [])
    : [];

  const barChartData = [
    {
      categoria: "Peças",
      total: analysis.meses.reduce((sum, m) => sum + m.pecas, 0)
    },
    {
      categoria: "Financiamento",
      total: analysis.meses.reduce((sum, m) => sum + m.financiamento, 0)
    },
    {
      categoria: "Consórcio",
      total: analysis.meses.reduce((sum, m) => sum + m.consorcio, 0)
    },
    {
      categoria: "Proc. Judiciais",
      total: analysis.meses.reduce((sum, m) => sum + m.processos_judiciais, 0)
    },
    {
      categoria: "Investimento",
      total: analysis.meses.reduce((sum, m) => sum + m.investimento, 0)
    }
  ];

  const pieChartData = barChartData.map(d => ({
    name: d.categoria,
    value: d.total
  }));

  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981'];

  const riskColors = {
    EXCELENTE: "from-green-500 to-emerald-600",
    SAUDAVEL: "from-blue-500 to-blue-600",
    ATENCAO: "from-yellow-500 to-amber-600",
    ALERTA_VERMELHO: "from-orange-500 to-red-600",
    CRITICO: "from-red-600 to-red-800"
  };

  const riskIcons = {
    EXCELENTE: CheckCircle2,
    SAUDAVEL: CheckCircle2,
    ATENCAO: AlertTriangle,
    ALERTA_VERMELHO: AlertTriangle,
    CRITICO: TrendingDown
  };

  const RiskIcon = riskIcons[analysis.risco_anual];

  const totalCustoPecas = analysis.custo_total_pecas_12m || 0;
  const totalCustoAdm = analysis.custo_total_administrativo_12m || 0;

  // Recuperar dados salvos ou recalcular se antigo
  const pontoEquilibrio = analysis.ponto_equilibrio || 0;
  const receitaAtual = analysis.meses[0].receita_prevista || 0;
  
  // Projeção de Caixa Líquido (3 Meses)
  const projecaoCaixa = analysis.caixa_liquido_projetado 
    ? analysis.caixa_liquido_projetado.map(p => ({ mes: `Mês ${p.mes}`, caixa: p.valor }))
    : analysis.meses.slice(0, 3).map(m => {
        const totalSaidas = m.dividas_total + (m.custo_previsto_pecas || 0) + (m.custo_previsto_administrativo || 0);
        return {
          mes: `Mês ${m.mes}`,
          caixa: m.receita_prevista - totalSaidas
        };
      });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Painel de Endividamento
          </h1>
          <p className="text-xl text-gray-600">Análise Completa com Projeções e Custos</p>
        </div>

        {/* Status Geral */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${riskColors[analysis.risco_anual]}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <RiskIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Risco Anual: {analysis.risco_anual}</h2>
                <p className="text-white/90 text-lg">
                  Comprometimento Médio: {analysis.media_anual_comprometimento.toFixed(2)}%
                </p>
                <p className="text-white/90">
                  Endividamento Total: R$ {analysis.endividamento_total_12m.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback e Ponto de Equilíbrio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-l-4 border-blue-500">
            <CardHeader>
              <CardTitle>Ponto de Equilíbrio & Metas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Ponto de Equilíbrio (Mês 1)</p>
                <p className="text-3xl font-bold text-blue-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pontoEquilibrio)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Necessário para cobrir Custos Fixos + Dívidas
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Feedback Estratégico
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  {analysis.feedback_vendas_pct > 0 ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                      <span>Aumentar vendas em <strong>{analysis.feedback_vendas_pct}%</strong> para atingir o zero a zero.</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Receita atual cobre o Ponto de Equilíbrio. Foco em margem!</span>
                    </li>
                  )}
                  <li>• Buscar reduzir custos com estoque de peças (Compras à vista/menor estoque).</li>
                  <li>• Repensar consórcios e novos investimentos até estabilizar o caixa.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-green-500">
            <CardHeader>
              <CardTitle>Projeção de Caixa Líquido (3 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projecaoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                  <Bar dataKey="caixa" name="Caixa Líquido" fill="#10b981">
                    {projecaoCaixa.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.caixa >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-center text-gray-500">
                Receita Prevista - (Total Custos + Dívidas)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-lg border-2 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Endividamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                R$ {(analysis.endividamento_total_12m / 1000).toFixed(1)}k
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Custos Peças
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                R$ {(totalCustoPecas / 1000).toFixed(1)}k
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                Custos Adm/Op
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                R$ {(totalCustoAdm / 1000).toFixed(1)}k
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mês Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                Mês {analysis.mes_maior_comprometimento}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mês Saudável</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                Mês {analysis.mes_menor_comprometimento}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Curva de Endividamento com Área */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Curva Visual de Endividamento (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={curvaEndividamentoData}>
                <defs>
                  <linearGradient id="colorComprometimento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="comprometimento" 
                  stroke="#ef4444" 
                  fillOpacity={1}
                  fill="url(#colorComprometimento)"
                  name="% Comprometimento"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Custos Previstos */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Custos Previstos Mensais (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={custosPrevistos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pecas" fill="#3b82f6" name="Peças" stackId="a" />
                <Bar dataKey="administrativo" fill="#8b5cf6" name="Administrativo" stackId="a" />
                <Bar dataKey="dividas" fill="#ef4444" name="Dívidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projeções de Cenários */}
        {projecoesData.length > 0 && (
          <Card className="shadow-lg border-2 border-indigo-200">
            <CardHeader>
              <CardTitle>Projeções de Cenários Futuros</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projecoesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="otimista" stroke="#10b981" strokeWidth={2} name="Otimista" />
                  <Line type="monotone" dataKey="realista" stroke="#3b82f6" strokeWidth={2} name="Realista" />
                  <Line type="monotone" dataKey="pessimista" stroke="#ef4444" strokeWidth={2} name="Pessimista" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráficos de Distribuição */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Distribuição por Categoria (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Proporção das Dívidas (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Relatório IA */}
        <Card className="shadow-lg border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              Relatório Executivo Gerado por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <ReactMarkdown>{analysis.relatorio_ia}</ReactMarkdown>
          </CardContent>
        </Card>

        {/* Plano Personalizado com IA */}
        {showActionPlanDetails && actionPlan ? (
          <div className="mb-6">
            <ActionPlanDetails
              plan={actionPlan}
              onUpdateActivity={(index, status) => updateActivityMutation.mutate({ activityIndex: index, status })}
              onBack={() => setShowActionPlanDetails(false)}
            />
          </div>
        ) : actionPlan ? (
          <div className="mb-6">
            <ActionPlanCard
              plan={actionPlan}
              onViewDetails={() => setShowActionPlanDetails(true)}
              onRefine={() => setShowFeedbackModal(true)}
            />
          </div>
        ) : (
          <Card className="mb-6 border-2 border-dashed border-red-300 bg-red-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Reestruturação Financeira com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano detalhado para reduzir dívidas e melhorar o fluxo de caixa.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {generatePlanMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" />Gerar Plano com IA</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <ActionPlanFeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(feedback) => refinePlanMutation.mutate({ feedback })}
          isLoading={refinePlanMutation.isPending}
        />

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button onClick={() => navigate(createPageUrl("DiagnosticoEndividamento"))} className="bg-red-600 hover:bg-red-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            Nova Análise
          </Button>
        </div>
      </div>
    </div>
  );
}
