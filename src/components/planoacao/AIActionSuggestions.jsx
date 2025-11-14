import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, Lightbulb, Target, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { questions } from "../diagnostic/Questions";

export default function AIActionSuggestions({ diagnostic, workshop, phase }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (diagnostic && workshop) {
      generateSuggestions();
    }
  }, [diagnostic?.id, workshop?.id]);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      // Preparar contexto do diagnóstico
      const answersJson = diagnostic.answers.map(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        const option = question?.options.find(opt => opt.letter === answer.selected_option);
        
        return {
          question: question?.question || "",
          resposta: option?.text || ""
        };
      });

      const prompt = `Você é um consultor especialista em gestão de oficinas mecânicas no Brasil.

DADOS DA OFICINA:
Nome: ${workshop.name}
Localização: ${workshop.city}/${workshop.state}
Segmento: ${workshop.segment || "Não informado"}
Faturamento mensal: ${workshop.monthly_revenue || "Não informado"}
Colaboradores: ${workshop.employees_count || "Não informado"}
Tempo de mercado: ${workshop.years_in_business || "Não informado"}
Desafio principal: ${workshop.main_challenge || "Não informado"}

FASE IDENTIFICADA: Fase ${diagnostic.phase}

RESPOSTAS DO DIAGNÓSTICO:
${JSON.stringify(answersJson, null, 2)}

Com base nessas informações, gere um JSON com a seguinte estrutura:

{
  "desafios_identificados": [
    {
      "titulo": "Nome do desafio",
      "descricao": "Descrição breve do desafio identificado",
      "impacto": "alto|medio|baixo",
      "evidencias": ["Lista de evidências das respostas"]
    }
  ],
  "acoes_prioritarias": [
    {
      "titulo": "Nome da ação",
      "descricao": "Descrição detalhada da ação recomendada",
      "categoria": "vendas|prospeccao|precificacao|pessoas",
      "prazo_sugerido": 30,
      "beneficios_esperados": ["Lista de benefícios"],
      "passos_implementacao": ["Passo 1", "Passo 2", "Passo 3"]
    }
  ],
  "metricas_acompanhar": [
    {
      "nome": "Nome da métrica",
      "descricao": "Como medir",
      "meta_sugerida": "Meta realista para 90 dias"
    }
  ],
  "insights_personalizados": [
    "Insight específico baseado no perfil da oficina"
  ]
}

IMPORTANTE:
- Gere de 3 a 5 desafios identificados
- Sugira de 5 a 8 ações prioritárias
- Indique de 4 a 6 métricas essenciais
- Forneça de 3 a 5 insights personalizados
- Seja específico e baseie-se nas respostas do diagnóstico
- Use linguagem clara e direta`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            desafios_identificados: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  impacto: { type: "string" },
                  evidencias: { type: "array", items: { type: "string" } }
                }
              }
            },
            acoes_prioritarias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  categoria: { type: "string" },
                  prazo_sugerido: { type: "number" },
                  beneficios_esperados: { type: "array", items: { type: "string" } },
                  passos_implementacao: { type: "array", items: { type: "string" } }
                }
              }
            },
            metricas_acompanhar: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  descricao: { type: "string" },
                  meta_sugerida: { type: "string" }
                }
              }
            },
            insights_personalizados: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error("Erro ao gerar sugestões:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getImpactColor = (impacto) => {
    const colors = {
      alto: "bg-red-100 text-red-700 border-red-300",
      medio: "bg-yellow-100 text-yellow-700 border-yellow-300",
      baixo: "bg-blue-100 text-blue-700 border-blue-300"
    };
    return colors[impacto] || colors.medio;
  };

  const getCategoryInfo = (categoria) => {
    const categories = {
      vendas: { label: "Vendas", color: "bg-green-100 text-green-700" },
      prospeccao: { label: "Prospecção", color: "bg-blue-100 text-blue-700" },
      precificacao: { label: "Precificação", color: "bg-purple-100 text-purple-700" },
      pessoas: { label: "Pessoas", color: "bg-orange-100 text-orange-700" }
    };
    return categories[categoria] || categories.vendas;
  };

  if (isGenerating) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Analisando seu diagnóstico com IA...
            </h3>
            <p className="text-gray-600">
              Gerando sugestões personalizadas e insights específicos para sua oficina
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) return null;

  return (
    <div className="space-y-6">
      {/* Desafios Identificados */}
      <Card className="shadow-lg border-2 border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Target className="w-6 h-6 text-red-600" />
              Desafios Identificados
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={generateSuggestions}
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {suggestions.desafios_identificados?.map((desafio, index) => (
              <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0">
                    <Badge className={`${getImpactColor(desafio.impacto)} border`}>
                      Impacto {desafio.impacto}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {desafio.titulo}
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      {desafio.descricao}
                    </p>
                    {desafio.evidencias && desafio.evidencias.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          📋 Evidências do diagnóstico:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {desafio.evidencias.map((evidencia, i) => (
                            <li key={i}>{evidencia}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ações Prioritárias Sugeridas */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Ações Prioritárias Recomendadas pela IA
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {suggestions.acoes_prioritarias?.map((acao, index) => {
              const categoryInfo = getCategoryInfo(acao.categoria);
              
              return (
                <div key={index} className="bg-white border-2 border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-xl text-gray-900">
                          {acao.titulo}
                        </h3>
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {acao.descricao}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Benefícios Esperados */}
                        {acao.beneficios_esperados && acao.beneficios_esperados.length > 0 && (
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Benefícios Esperados:
                            </p>
                            <ul className="space-y-1 text-sm text-green-800">
                              {acao.beneficios_esperados.map((beneficio, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-green-600">✓</span>
                                  <span>{beneficio}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Passos de Implementação */}
                        {acao.passos_implementacao && acao.passos_implementacao.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Como Implementar:
                            </p>
                            <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside">
                              {acao.passos_implementacao.map((passo, i) => (
                                <li key={i}>{passo}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold">Prazo sugerido:</span>
                        <Badge variant="outline">{acao.prazo_sugerido} dias</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Métricas para Acompanhar */}
      <Card className="shadow-lg border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-xl">
            📊 Métricas Essenciais para Acompanhar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.metricas_acompanhar?.map((metrica, index) => (
              <div key={index} className="bg-white border-2 border-purple-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">{metrica.nome}</h4>
                <p className="text-sm text-gray-700 mb-2">{metrica.descricao}</p>
                <div className="bg-purple-50 rounded p-2 mt-2">
                  <p className="text-xs text-purple-900">
                    <strong>Meta sugerida (90 dias):</strong> {metrica.meta_sugerida}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Personalizados */}
      {suggestions.insights_personalizados && suggestions.insights_personalizados.length > 0 && (
        <Card className="shadow-lg border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              💡 Insights Personalizados para {workshop.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {suggestions.insights_personalizados.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-yellow-300">
                  <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-800 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}