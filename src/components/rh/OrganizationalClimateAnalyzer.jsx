import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, TrendingDown, AlertCircle, ThumbsUp, MessageSquare, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function OrganizationalClimateAnalyzer({ workshopId }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks', workshopId],
    queryFn: async () => {
      const result = await base44.entities.EmployeeFeedback.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId
  });

  const { data: warnings = [] } = useQuery({
    queryKey: ['warnings', workshopId],
    queryFn: async () => {
      const result = await base44.entities.EmployeeWarning.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', workshopId],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId
  });

  const analyzeClimate = async () => {
    if (feedbacks.length === 0) {
      toast.error("Não há dados suficientes para análise");
      return;
    }

    setLoading(true);
    try {
      const positiveFeedbacks = feedbacks.filter(f => f.feedback_type === 'positivo').length;
      const negativeFeedbacks = feedbacks.filter(f => f.feedback_type === 'corretivo').length;
      const avgEngagement = employees.reduce((acc, e) => acc + (e.engagement_score || 0), 0) / employees.length || 0;

      const recentFeedbacks = feedbacks.slice(0, 20).map(f => ({
        type: f.feedback_type,
        content: f.content?.substring(0, 200)
      }));

      const prompt = `
Você é um especialista em análise de clima organizacional.

Analise os dados de uma oficina automotiva:

📊 DADOS QUANTITATIVOS:
- Total de colaboradores: ${employees.length}
- Feedbacks positivos: ${positiveFeedbacks}
- Feedbacks corretivos: ${negativeFeedbacks}
- Advertências nos últimos 6 meses: ${warnings.length}
- Engajamento médio: ${avgEngagement.toFixed(0)}%

💬 AMOSTRA DE FEEDBACKS RECENTES:
${recentFeedbacks.map(f => `[${f.type}] ${f.content}`).join('\n')}

Com base nestes dados, retorne uma análise estruturada do clima organizacional:

{
  "climate_score": number (0-100),
  "climate_status": "excelente" | "bom" | "regular" | "crítico",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "risk_indicators": ["string"],
  "improvement_actions": [
    {
      "priority": "alta" | "média" | "baixa",
      "action": "string",
      "impact": "string"
    }
  ],
  "trends": {
    "engagement": "crescente" | "estável" | "decrescente",
    "satisfaction": "crescente" | "estável" | "decrescente"
  },
  "recommendations": ["string"]
}
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            climate_score: { type: "number" },
            climate_status: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            risk_indicators: { type: "array", items: { type: "string" } },
            improvement_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  action: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            trends: {
              type: "object",
              properties: {
                engagement: { type: "string" },
                satisfaction: { type: "string" }
              }
            },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(response);
      toast.success("Análise de clima concluída!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar clima: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    excelente: { bg: "bg-green-100", text: "text-green-700", icon: TrendingUp },
    bom: { bg: "bg-blue-100", text: "text-blue-700", icon: ThumbsUp },
    regular: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle },
    crítico: { bg: "bg-red-100", text: "text-red-700", icon: TrendingDown }
  };

  const priorityColors = {
    alta: "bg-red-100 text-red-700",
    média: "bg-yellow-100 text-yellow-700",
    baixa: "bg-green-100 text-green-700"
  };

  return (
    <Card className="shadow-lg border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Análise de Clima Organizacional (IA)
        </CardTitle>
        <CardDescription>
          Insights baseados em feedbacks, advertências e engajamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="text-center py-12">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analisar Clima Organizacional
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-2">
              A IA analisará {feedbacks.length} feedbacks, {warnings.length} advertências e {employees.length} colaboradores
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Recomendado: mínimo 10 feedbacks para análise confiável
            </p>
            <Button 
              onClick={analyzeClimate}
              disabled={loading || feedbacks.length < 5}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg h-auto"
            >
              {loading ? (
                <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Analisando...</>
              ) : (
                <><BarChart3 className="w-6 h-6 mr-2" /> Iniciar Análise</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-center text-white">
              <div className="text-6xl font-bold mb-2">{analysis.climate_score}</div>
              <div className="flex items-center justify-center gap-2">
                {React.createElement(statusColors[analysis.climate_status]?.icon || AlertCircle, { className: "w-5 h-5" })}
                <span className="text-xl font-semibold uppercase">{analysis.climate_status}</span>
              </div>
            </div>

            {/* Tendências */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Engajamento</div>
                  <div className="flex items-center gap-2">
                    {analysis.trends?.engagement === 'crescente' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : analysis.trends?.engagement === 'decrescente' ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                    )}
                    <span className="font-semibold capitalize">{analysis.trends?.engagement}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Satisfação</div>
                  <div className="flex items-center gap-2">
                    {analysis.trends?.satisfaction === 'crescente' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : analysis.trends?.satisfaction === 'decrescente' ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                    )}
                    <span className="font-semibold capitalize">{analysis.trends?.satisfaction}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pontos Fortes */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                Pontos Fortes
              </h3>
              <div className="space-y-2">
                {analysis.strengths?.map((strength, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2" />
                    <p className="text-sm text-green-900">{strength}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pontos de Atenção */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Pontos de Atenção
              </h3>
              <div className="space-y-2">
                {analysis.weaknesses?.map((weakness, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2" />
                    <p className="text-sm text-orange-900">{weakness}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicadores de Risco */}
            {analysis.risk_indicators?.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Indicadores de Risco
                </h3>
                <ul className="space-y-1">
                  {analysis.risk_indicators.map((risk, i) => (
                    <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                      <span className="text-red-600">⚠️</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ações de Melhoria */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Plano de Ação</h3>
              <div className="space-y-3">
                {analysis.improvement_actions?.map((action, i) => (
                  <Card key={i} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={priorityColors[action.priority]}>
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900 mb-1">{action.action}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Impacto esperado:</strong> {action.impact}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recomendações */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Recomendações Estratégicas</h3>
              <ul className="space-y-1">
                {analysis.recommendations?.map((rec, i) => (
                  <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-600">💡</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAnalysis(null)} className="flex-1">
                Limpar Análise
              </Button>
              <Button onClick={analyzeClimate} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Atualizar Análise
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}