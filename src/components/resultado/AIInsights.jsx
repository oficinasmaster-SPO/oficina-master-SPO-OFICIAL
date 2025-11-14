import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AIInsights({ diagnostic, workshop, phaseDistribution }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (diagnostic && !insights) {
      generateInsights();
    }
  }, [diagnostic]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const answersData = diagnostic.answers.map(a => ({
        questao: a.question_id,
        resposta: a.selected_option
      }));

      const workshopData = workshop ? {
        nome: workshop.name,
        segmento: workshop.segment,
        faturamento: workshop.monthly_revenue,
        colaboradores: workshop.employees_count,
        tempo_mercado: workshop.years_in_business,
        principal_desafio: workshop.main_challenge,
        cidade: workshop.city,
        estado: workshop.state
      } : null;

      const distributionData = phaseDistribution.map(p => ({
        fase: p.phase,
        percentual: p.percent,
        titulo: p.shortTitle
      }));

      const prompt = `Você é um consultor especializado em gestão de oficinas automotivas. Analise os dados abaixo e gere insights profundos e acionáveis.

DADOS DA OFICINA:
${JSON.stringify(workshopData, null, 2)}

FASE PRINCIPAL: Fase ${diagnostic.phase}
DISTRIBUIÇÃO DE RESPOSTAS:
${JSON.stringify(distributionData, null, 2)}

RESPOSTAS DO DIAGNÓSTICO:
${JSON.stringify(answersData, null, 2)}

Gere um JSON com a seguinte estrutura (IMPORTANTE: retorne APENAS o JSON, sem texto adicional):

{
  "pontos_fortes": [
    {
      "titulo": "Título curto do ponto forte",
      "descricao": "Descrição detalhada de 2-3 linhas",
      "impacto": "alto" ou "medio"
    }
  ],
  "areas_atencao": [
    {
      "titulo": "Título curto da área",
      "descricao": "Descrição detalhada de 2-3 linhas",
      "urgencia": "alta" ou "media" ou "baixa"
    }
  ],
  "oportunidades_rapidas": [
    {
      "titulo": "Título da oportunidade",
      "descricao": "Descrição detalhada de 2-3 linhas",
      "resultado_esperado": "Resultado concreto esperado",
      "prazo_dias": número de dias para implementar
    }
  ],
  "recomendacoes_estrategicas": [
    {
      "titulo": "Título da recomendação",
      "descricao": "Descrição detalhada de 2-3 linhas",
      "prioridade": "alta" ou "media" ou "baixa"
    }
  ]
}

IMPORTANTE:
- Identifique 3-4 pontos fortes baseados nas respostas
- Identifique 3-4 áreas que precisam de atenção
- Liste 4-5 oportunidades de melhoria rápida (quick wins)
- Forneça 3-4 recomendações estratégicas de médio/longo prazo
- Seja específico para a realidade da oficina
- Use dados concretos quando possível`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            pontos_fortes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  impacto: { type: "string" }
                }
              }
            },
            areas_atencao: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  urgencia: { type: "string" }
                }
              }
            },
            oportunidades_rapidas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  resultado_esperado: { type: "string" },
                  prazo_dias: { type: "number" }
                }
              }
            },
            recomendacoes_estrategicas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  prioridade: { type: "string" }
                }
              }
            }
          }
        },
        add_context_from_internet: false
      });

      setInsights(response);
      toast.success("Insights gerados com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar insights:", error);
      toast.error("Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-12">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-semibold text-gray-900">Gerando insights inteligentes...</p>
            <p className="text-sm text-gray-600 mt-2">A IA está analisando seus dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const getUrgencyColor = (urgency) => {
    const colors = {
      'alta': 'bg-red-100 text-red-700 border-red-300',
      'media': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'baixa': 'bg-blue-100 text-blue-700 border-blue-300'
    };
    return colors[urgency] || colors['media'];
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'alta': 'bg-purple-100 text-purple-700',
      'media': 'bg-indigo-100 text-indigo-700',
      'baixa': 'bg-gray-100 text-gray-700'
    };
    return colors[priority] || colors['media'];
  };

  const getImpactColor = (impact) => {
    const colors = {
      'alto': 'bg-green-100 text-green-700',
      'medio': 'bg-blue-100 text-blue-700'
    };
    return colors[impact] || colors['medio'];
  };

  return (
    <div className="space-y-6">
      {/* Pontos Fortes */}
      <Card className="shadow-lg border-l-4 border-green-500">
        <CardHeader className="bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <CardTitle className="text-xl">Pontos Fortes Identificados</CardTitle>
            </div>
            <Button
              onClick={generateInsights}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.pontos_fortes?.map((ponto, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{ponto.titulo}</h4>
                  <Badge className={getImpactColor(ponto.impacto)}>
                    Impacto {ponto.impacto}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{ponto.descricao}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Áreas de Atenção */}
      <Card className="shadow-lg border-l-4 border-orange-500">
        <CardHeader className="bg-orange-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <CardTitle className="text-xl">Áreas que Precisam de Atenção</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {insights.areas_atencao?.map((area, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${getUrgencyColor(area.urgencia)}`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{area.titulo}</h4>
                  <Badge variant="outline">
                    Urgência {area.urgencia}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{area.descricao}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Oportunidades Rápidas (Quick Wins) */}
      <Card className="shadow-lg border-l-4 border-blue-500">
        <CardHeader className="bg-blue-50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-xl">Oportunidades Rápidas (Quick Wins)</CardTitle>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Ações que podem gerar resultados em curto prazo
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {insights.oportunidades_rapidas?.map((oportunidade, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{oportunidade.titulo}</h4>
                  <Badge className="bg-blue-100 text-blue-700">
                    {oportunidade.prazo_dias} dias
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  {oportunidade.descricao}
                </p>
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Resultado Esperado:</p>
                  <p className="text-sm text-blue-800">{oportunidade.resultado_esperado}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recomendações Estratégicas */}
      <Card className="shadow-lg border-l-4 border-purple-500">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-xl">Recomendações Estratégicas</CardTitle>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Direcionamentos de médio e longo prazo
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {insights.recomendacoes_estrategicas?.map((recomendacao, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border-2 border-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{recomendacao.titulo}</h4>
                  <Badge className={getPriorityColor(recomendacao.prioridade)}>
                    Prioridade {recomendacao.prioridade}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{recomendacao.descricao}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}