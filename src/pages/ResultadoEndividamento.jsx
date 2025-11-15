import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, TrendingDown, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function ResultadoEndividamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analysis) return null;

  const lineChartData = analysis.meses.map(m => ({
    mes: `Mês ${m.mes}`,
    comprometimento: m.comprometimento
  }));

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado - Análise de Endividamento
          </h1>
          <p className="text-xl text-gray-600">Curva dos Próximos 12 Meses</p>
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

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg border-2 border-red-200">
            <CardHeader>
              <CardTitle className="text-lg">Mês Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                Mês {analysis.mes_maior_comprometimento}
              </p>
              <p className="text-sm text-gray-600 mt-1">Maior comprometimento</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">Mês Saudável</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                Mês {analysis.mes_menor_comprometimento}
              </p>
              <p className="text-sm text-gray-600 mt-1">Menor comprometimento</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Total 12 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                R$ {(analysis.endividamento_total_12m / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-gray-600 mt-1">Endividamento acumulado</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Linha - Comprometimento Mensal */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Evolução do Comprometimento (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="comprometimento" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  name="% Comprometimento"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráficos de Barras e Pizza */}
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