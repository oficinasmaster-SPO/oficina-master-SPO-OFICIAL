import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, AlertTriangle, Award, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EvolucaoMaturidade({ employee }) {
  const navigate = useNavigate();

  const { data: maturityDiagnostics = [] } = useQuery({
    queryKey: ['maturity-diagnostics', employee.id],
    queryFn: async () => {
      const all = await base44.entities.CollaboratorMaturityDiagnostic.list('-created_date');
      return all.filter(d => d.employee_id === employee.id && d.completed);
    }
  });

  const { data: performanceDiagnostics = [] } = useQuery({
    queryKey: ['performance-diagnostics', employee.id],
    queryFn: async () => {
      const all = await base44.entities.PerformanceMatrixDiagnostic.list('-created_date');
      return all.filter(d => d.employee_id === employee.id && d.completed);
    }
  });

  const maturityLevels = {
    bebe: { label: "Bebê", value: 1, color: "#ef4444" },
    crianca: { label: "Criança", value: 2, color: "#f59e0b" },
    adolescente: { label: "Adolescente", value: 3, color: "#3b82f6" },
    adulto: { label: "Adulto", value: 4, color: "#22c55e" }
  };

  const chartData = maturityDiagnostics.map(diag => ({
    date: new Date(diag.created_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    maturidade: maturityLevels[diag.maturity_level]?.value || 0
  }));

  const performanceChartData = performanceDiagnostics.map(diag => ({
    date: new Date(diag.created_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    tecnico: diag.technical_average || 0,
    emocional: diag.emotional_average || 0
  }));

  const latestMaturity = maturityDiagnostics[0];
  const latestPerformance = performanceDiagnostics[0];

  const getRecommendation = () => {
    if (!latestMaturity && !latestPerformance) {
      return {
        title: "Sem avaliações",
        description: "Realize diagnósticos para acompanhar a evolução",
        icon: Brain,
        color: "bg-gray-100 text-gray-700"
      };
    }

    if (latestPerformance) {
      const classification = latestPerformance.classification;
      
      if (classification === "demissao") {
        return {
          title: "Atenção Crítica",
          description: "Performance abaixo do esperado. Considerar ações corretivas urgentes.",
          icon: AlertTriangle,
          color: "bg-red-100 text-red-700"
        };
      }
      
      if (classification === "treinamento_tecnico" || classification === "treinamento_emocional") {
        return {
          title: "Desenvolvimento Necessário",
          description: "Investir em treinamento para melhorar competências específicas.",
          icon: TrendingUp,
          color: "bg-yellow-100 text-yellow-700"
        };
      }
      
      if (classification === "investimento" || classification === "reconhecimento") {
        return {
          title: "Alto Desempenho",
          description: "Colaborador exemplar. Reconhecer e investir em crescimento.",
          icon: Award,
          color: "bg-green-100 text-green-700"
        };
      }
    }

    return {
      title: "Em Acompanhamento",
      description: "Continue monitorando o desenvolvimento do colaborador.",
      icon: Brain,
      color: "bg-blue-100 text-blue-700"
    };
  };

  const recommendation = getRecommendation();
  const RecommendationIcon = recommendation.icon;

  return (
    <div className="space-y-6">
      <Card className={`shadow-lg border-2 ${recommendation.color.includes('red') ? 'border-red-300' : recommendation.color.includes('green') ? 'border-green-300' : 'border-gray-300'}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${recommendation.color} rounded-lg flex items-center justify-center`}>
              <RecommendationIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>{recommendation.title}</CardTitle>
              <CardDescription>{recommendation.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Nível de Maturidade Atual</p>
              <p className="text-2xl font-bold text-gray-900">
                {latestMaturity ? maturityLevels[latestMaturity.maturity_level]?.label : "-"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Performance Técnica</p>
              <p className="text-2xl font-bold text-blue-600">
                {latestPerformance ? `${latestPerformance.technical_average.toFixed(1)}/10` : "-"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Performance Emocional</p>
              <p className="text-2xl font-bold text-purple-600">
                {latestPerformance ? `${latestPerformance.emotional_average.toFixed(1)}/10` : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {chartData.length > 1 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Evolução de Maturidade</CardTitle>
            <CardDescription>Histórico de avaliações ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} />
                <Tooltip 
                  formatter={(value) => {
                    const level = Object.values(maturityLevels).find(l => l.value === value);
                    return level ? level.label : value;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="maturidade" stroke="#8b5cf6" strokeWidth={2} name="Maturidade" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {performanceChartData.length > 1 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Evolução de Performance</CardTitle>
            <CardDescription>Competências técnicas e emocionais ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tecnico" stroke="#3b82f6" strokeWidth={2} name="Técnico" />
                <Line type="monotone" dataKey="emocional" stroke="#a855f7" strokeWidth={2} name="Emocional" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={() => navigate(createPageUrl("DiagnosticoMaturidade") + `?employeeId=${employee.id}`)}>
          Avaliar Maturidade
        </Button>
        <Button variant="outline" onClick={() => navigate(createPageUrl("DiagnosticoDesempenho") + `?employeeId=${employee.id}`)}>
          Avaliar Performance
        </Button>
      </div>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
            <CardTitle>Histórico de Diagnósticos</CardTitle>
        </CardHeader>
        <CardContent>
            {maturityDiagnostics.length === 0 && performanceDiagnostics.length === 0 ? (
                <p className="text-gray-500 text-center">Nenhum diagnóstico registrado.</p>
            ) : (
                <div className="space-y-2">
                    {[...maturityDiagnostics, ...performanceDiagnostics]
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map((diag, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50">
                                <div>
                                    <p className="font-medium text-sm">
                                        {diag.maturity_level ? "Maturidade" : "Desempenho"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(diag.created_date).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold">
                                        {diag.maturity_level ? 
                                            maturityLevels[diag.maturity_level]?.label : 
                                            diag.classification?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}