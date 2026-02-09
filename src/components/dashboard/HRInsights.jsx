import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, TrendingDown, TrendingUp, Heart, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function HRInsights({ employees = [] }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const generateInsights = async () => {
    if (employees.length === 0) {
      toast.error("Nenhum colaborador encontrado");
      return;
    }

    setLoading(true);

    try {
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(e => e.status === 'ativo').length;
      const avgProductivity = employees.reduce((sum, e) => {
        const cost = e.salary + (e.commission || 0) + (e.bonus || 0);
        const production = (e.production_parts || 0) + (e.production_services || 0);
        return sum + (cost > 0 ? (production / cost) * 100 : 0);
      }, 0) / totalEmployees;

      const positionDistribution = employees.reduce((acc, e) => {
        acc[e.position] = (acc[e.position] || 0) + 1;
        return acc;
      }, {});

      const prompt = `
Você é um consultor de RH da metodologia Oficinas Master especializado em análise organizacional.

DADOS DA EQUIPE:
Total de colaboradores: ${totalEmployees}
Colaboradores ativos: ${activeEmployees}
Produtividade média: ${avgProductivity.toFixed(1)}%
Distribuição por cargo: ${JSON.stringify(positionDistribution)}

Analise esses dados e forneça insights estratégicos sobre:
1. Clima organizacional (estimativa baseada em produtividade e dados disponíveis)
2. Risco de turnover (identificar sinais de alerta)
3. Sugestões para melhorar engajamento
4. Análise de estrutura da equipe
5. Recomendações específicas para gestão de pessoas

Retorne um JSON:
{
  "organizational_climate": {
    "score": number (0-100),
    "status": "excelente | bom | atenção | crítico",
    "analysis": "string"
  },
  "turnover_risk": {
    "level": "baixo | médio | alto",
    "at_risk_count": number,
    "factors": ["string"],
    "recommendations": ["string"]
  },
  "engagement_suggestions": [
    {
      "title": "string",
      "description": "string",
      "impact": "alto | médio | baixo",
      "implementation": "curto prazo | médio prazo | longo prazo"
    }
  ],
  "team_structure": {
    "analysis": "string",
    "gaps": ["string"],
    "strengths": ["string"]
  },
  "priority_actions": [
    {
      "action": "string",
      "urgency": "imediata | curto prazo | médio prazo",
      "expected_result": "string"
    }
  ]
}

Seja específico e prático para o setor automotivo.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            organizational_climate: {
              type: "object",
              properties: {
                score: { type: "number" },
                status: { type: "string" },
                analysis: { type: "string" }
              }
            },
            turnover_risk: {
              type: "object",
              properties: {
                level: { type: "string" },
                at_risk_count: { type: "number" },
                factors: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
              }
            },
            engagement_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" },
                  implementation: { type: "string" }
                }
              }
            },
            team_structure: {
              type: "object",
              properties: {
                analysis: { type: "string" },
                gaps: { type: "array", items: { type: "string" } },
                strengths: { type: "array", items: { type: "string" } }
              }
            },
            priority_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  urgency: { type: "string" },
                  expected_result: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(response);
      toast.success("Insights gerados!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    excelente: "from-green-500 to-emerald-600",
    bom: "from-blue-500 to-blue-600",
    atenção: "from-yellow-500 to-orange-600",
    crítico: "from-red-500 to-red-600"
  };

  const riskColors = {
    baixo: "text-green-600",
    médio: "text-yellow-600",
    alto: "text-red-600"
  };

  return (
    <div className="space-y-6">
      {!insights ? (
        <Card className="shadow-lg border-2 border-purple-200">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Insights de IA para RH
            </h3>
            <p className="text-gray-600 mb-6">
              Análise de clima, turnover e engajamento gerada por inteligência artificial
            </p>
            <Button
              onClick={generateInsights}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analisando...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Gerar Insights de RH</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Clima Organizacional */}
          <Card className={`shadow-lg border-2 bg-gradient-to-br ${statusColors[insights.organizational_climate.status]}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Heart className="w-6 h-6" />
                Clima Organizacional
              </CardTitle>
            </CardHeader>
            <CardContent className="text-white">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">Score: {insights.organizational_climate.score}/100</span>
                  <span className="text-sm uppercase font-bold">{insights.organizational_climate.status}</span>
                </div>
                <Progress value={insights.organizational_climate.score} className="h-3 bg-white/30" />
              </div>
              <p className="text-white/90">{insights.organizational_climate.analysis}</p>
            </CardContent>
          </Card>

          {/* Risco de Turnover */}
          <Card className="shadow-lg border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-6 h-6 text-orange-600" />
                Análise de Turnover
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Nível de Risco</p>
                  <p className={`text-2xl font-bold ${riskColors[insights.turnover_risk.level]}`}>
                    {insights.turnover_risk.level.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Em Risco</p>
                  <p className="text-2xl font-bold text-orange-600">{insights.turnover_risk.at_risk_count}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Fatores de Risco:</h4>
                <ul className="space-y-1">
                  {insights.turnover_risk.factors.map((factor, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-600">⚠️</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Recomendações:</h4>
                <ul className="space-y-1">
                  {insights.turnover_risk.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Sugestões de Engajamento */}
          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Ações para Melhorar Engajamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.engagement_suggestions.map((suggestion, i) => (
                  <div key={i} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">{suggestion.title}</h4>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">
                          {suggestion.impact}
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded">
                          {suggestion.implementation}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Estrutura da Equipe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Pontos Fortes da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.team_structure.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-600 font-bold">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Lacunas Identificadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.team_structure.gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-600 font-bold">!</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Ações Prioritárias */}
          <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader>
              <CardTitle>Ações Prioritárias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.priority_actions.map((action, i) => (
                  <div key={i} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-purple-900">{action.action}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        action.urgency === 'imediata' ? 'bg-red-200 text-red-800' :
                        action.urgency === 'curto prazo' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {action.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>Resultado esperado:</strong> {action.expected_result}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              onClick={generateInsights}
              variant="outline"
              className="w-full md:w-auto"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Nova Análise
            </Button>
          </div>
        </>
      )}
    </div>
  );
}