import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Loader2, TrendingUp, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIInsightsButton({ assessments }) {
  const [showDialog, setShowDialog] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const handleAnalyze = async () => {
    if (assessments.length === 0) {
      toast.error("Nenhuma avaliação para analisar");
      return;
    }

    setAnalyzing(true);
    try {
      // Preparar dados para análise
      const data = assessments.map(a => ({
        tipo: a.typeName,
        titulo: a.title,
        data: a.date,
        status: a.status,
        resultado: a.score
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um consultor de excelência operacional especializado em oficinas mecânicas.

Analise o histórico de ${assessments.length} avaliações abaixo e forneça insights profundos:

${JSON.stringify(data, null, 2)}

ANÁLISE REQUERIDA:

1. **Tendências Positivas**: Identifique 3-5 pontos de melhoria clara ao longo do tempo
2. **Áreas de Atenção**: Identifique 3-5 pontos de preocupação ou estagnação
3. **Padrões Identificados**: Detecte padrões temporais, sazonalidade, correlações entre diferentes tipos de avaliação
4. **Recomendações Prioritárias**: Liste 5 ações específicas e práticas para acelerar o crescimento
5. **Próximos Passos**: Sugira quais avaliações fazer agora para maximizar o impacto

Seja específico, direto e orientado a resultados. Use dados concretos do histórico.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Resumo executivo em 2-3 frases" },
            positive_trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trend: { type: "string" },
                  evidence: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            areas_of_concern: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  concern: { type: "string" },
                  evidence: { type: "string" },
                  risk: { type: "string" }
                }
              }
            },
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            priority_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  rationale: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            next_assessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  assessment: { type: "string" },
                  reason: { type: "string" },
                  timing: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(result);
      toast.success("Análise concluída!");
    } catch (error) {
      toast.error("Erro ao analisar: " + error.message);
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setShowDialog(true);
          if (!insights) handleAnalyze();
        }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
      >
        <Brain className="w-4 h-4 mr-2" />
        Analisar Progresso com IA
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Brain className="w-6 h-6 text-purple-600" />
              Análise Inteligente do Seu Progresso
            </DialogTitle>
          </DialogHeader>

          {analyzing ? (
            <Card className="border-2 border-dashed border-purple-300">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-purple-600" />
                <p className="text-lg font-medium text-gray-700">
                  Analisando {assessments.length} avaliações...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Aguarde enquanto a IA identifica padrões e gera insights personalizados
                </p>
              </CardContent>
            </Card>
          ) : insights ? (
            <div className="space-y-6">
              {/* Summary */}
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-purple-900 mb-2">Resumo Executivo</h3>
                  <p className="text-gray-700">{insights.summary}</p>
                </CardContent>
              </Card>

              {/* Positive Trends */}
              {insights.positive_trends?.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Tendências Positivas
                    </h3>
                    <div className="space-y-3">
                      {insights.positive_trends.map((trend, i) => (
                        <div key={i} className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="font-semibold text-green-900 mb-1">{trend.trend}</p>
                          <p className="text-sm text-gray-700 mb-1">📊 {trend.evidence}</p>
                          <p className="text-sm text-green-700 font-medium">💡 Impacto: {trend.impact}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Areas of Concern */}
              {insights.areas_of_concern?.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Áreas de Atenção
                    </h3>
                    <div className="space-y-3">
                      {insights.areas_of_concern.map((concern, i) => (
                        <div key={i} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="font-semibold text-orange-900 mb-1">{concern.concern}</p>
                          <p className="text-sm text-gray-700 mb-1">📊 {concern.evidence}</p>
                          <p className="text-sm text-orange-700 font-medium">⚠️ Risco: {concern.risk}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Priority Actions */}
              {insights.priority_actions?.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Recomendações Prioritárias
                    </h3>
                    <div className="space-y-3">
                      {insights.priority_actions.map((action, i) => (
                        <div key={i} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-3">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-blue-900 mb-1">{action.action}</p>
                              <p className="text-sm text-gray-700 mb-1">📝 {action.rationale}</p>
                              <p className="text-sm text-blue-700 font-medium">🎯 Impacto: {action.expected_impact}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Assessments */}
              {insights.next_assessments?.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Próximas Avaliações Recomendadas
                    </h3>
                    <div className="space-y-3">
                      {insights.next_assessments.map((assessment, i) => (
                        <div key={i} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="font-semibold text-purple-900 mb-1">{assessment.assessment}</p>
                          <p className="text-sm text-gray-700 mb-1">💭 {assessment.reason}</p>
                          <p className="text-sm text-purple-700 font-medium">⏰ {assessment.timing}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Fechar
                </Button>
                <Button onClick={handleAnalyze} className="bg-purple-600 hover:bg-purple-700">
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar Novamente
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}