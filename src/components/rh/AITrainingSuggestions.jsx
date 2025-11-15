import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, BookOpen, Target, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AITrainingSuggestions({ employee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const generateSuggestions = async () => {
    setLoading(true);

    try {
      const totalCost = employee.salary + (employee.commission || 0) + (employee.bonus || 0);
      const totalProduction = (employee.production_parts || 0) + (employee.production_services || 0);
      const productivity = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;

      const prompt = `
Você é um consultor de RH da metodologia Oficinas Master especializado em treinamentos automotivos.

COLABORADOR:
Nome: ${employee.full_name}
Cargo: ${employee.position}
Produtividade: ${productivity}%
Custo Total: R$ ${totalCost.toFixed(2)}
Produção Total: R$ ${totalProduction.toFixed(2)}

Analise este perfil e sugira treinamentos personalizados focados em:
1. Melhorar a produtividade
2. Desenvolver competências técnicas específicas do cargo
3. Desenvolver competências comportamentais
4. Preparar para crescimento na carreira

Retorne um JSON com:
{
  "analysis": "string (análise do perfil atual)",
  "trainings": [
    {
      "title": "string",
      "category": "técnico | comportamental | gestão",
      "priority": "alta | média | baixa",
      "duration": "string (ex: 40h)",
      "description": "string",
      "expected_impact": "string"
    }
  ],
  "career_path": "string (sugestão de plano de carreira)",
  "development_goals": ["string"]
}

Seja específico para o setor automotivo e foque em resultados práticos.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            trainings: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  duration: { type: "string" },
                  description: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            career_path: { type: "string" },
            development_goals: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSuggestions(response);
      toast.success("Sugestões geradas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    alta: "bg-red-100 text-red-700",
    média: "bg-yellow-100 text-yellow-700",
    baixa: "bg-green-100 text-green-700"
  };

  const categoryIcons = {
    técnico: BookOpen,
    comportamental: Target,
    gestão: TrendingUp
  };

  return (
    <Card className="shadow-xl border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          Sugestões de Treinamento - {employee.full_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!suggestions ? (
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Gere sugestões personalizadas de treinamento usando IA
            </p>
            <Button
              onClick={generateSuggestions}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Gerar Sugestões</>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Análise do Perfil</h3>
              <p className="text-sm text-blue-800">{suggestions.analysis}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Treinamentos Recomendados</h3>
              <div className="space-y-3">
                {suggestions.trainings.map((training, index) => {
                  const Icon = categoryIcons[training.category] || BookOpen;
                  return (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{training.title}</h4>
                              <Badge className={priorityColors[training.priority]}>
                                {training.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{training.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>⏱️ {training.duration}</span>
                              <span>📚 {training.category}</span>
                            </div>
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                              <strong>Impacto esperado:</strong> {training.expected_impact}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Plano de Carreira</h3>
              <p className="text-sm text-purple-800">{suggestions.career_path}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Metas de Desenvolvimento</h3>
              <ul className="space-y-2">
                {suggestions.development_goals.map((goal, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Fechar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={generateSuggestions}>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Novamente
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}