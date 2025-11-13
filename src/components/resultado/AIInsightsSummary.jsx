import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { questions } from "../diagnostic/Questions";

export default function AIInsightsSummary({ diagnostic, phaseDistribution, workshop }) {
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (diagnostic && phaseDistribution) {
      generateSummary();
    }
  }, [diagnostic?.id]);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      // Preparar dados das respostas com as perguntas
      const answersJson = diagnostic.answers.map(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        const option = question?.options.find(opt => opt.letter === answer.selected_option);
        
        return {
          question_id: answer.question_id,
          question_text: question?.question || "",
          selected_option: answer.selected_option,
          option_meaning: option?.text || ""
        };
      });

      // Fase dominante
      const dominantPhase = phaseDistribution.reduce((prev, current) => 
        current.count > prev.count ? current : prev
      );

      // Fases secundárias significativas
      const secondaryPhases = phaseDistribution
        .filter(p => p.percent >= 15 && p.phase !== dominantPhase.phase)
        .sort((a, b) => b.percent - a.percent);

      const prompt = `Você é um consultor especializado em gestão de oficinas automotivas. 

Analise o diagnóstico abaixo e gere um RESUMO EXECUTIVO CONCISO E DIRETO.

DADOS DA OFICINA:
Nome: ${workshop?.name || "Não informado"}
Cidade/Estado: ${workshop?.city || "Não informado"} / ${workshop?.state || "Não informado"}
Segmento: ${workshop?.segment ? workshop.segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}

DISTRIBUIÇÃO DO DIAGNÓSTICO:
- Fase Principal: Fase ${dominantPhase.phase} (${dominantPhase.percent}% das respostas)
${secondaryPhases.length > 0 ? `- Características Secundárias: ${secondaryPhases.map(p => `Fase ${p.phase} (${p.percent}%)`).join(', ')}` : ''}

RESPOSTAS COMPLETAS:
${JSON.stringify(answersJson, null, 2)}

TAREFA: Gere um RESUMO EXECUTIVO com NO MÁXIMO 400 palavras contendo:

## Diagnóstico da Sua Oficina

[1-2 parágrafos descrevendo a situação atual da oficina com base nas respostas específicas. Seja direto e cite exemplos concretos das respostas.]

## O Que Você Precisa Fazer AGORA

[Liste 3-5 ações prioritárias IMEDIATAS para os próximos 30 dias, específicas para a fase identificada. Seja super prático e acionável.]

## Impacto Esperado

[1 parágrafo curto sobre os resultados que a oficina pode esperar ao implementar essas ações.]

REGRAS:
- Fale em 2ª pessoa ("você", "sua oficina")
- Seja DIRETO e PRÁTICO
- Use dados REAIS das respostas
- Evite teorias, foque em AÇÃO
- Use markdown para formatação
- Máximo 400 palavras`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedSummary(result);
    } catch (error) {
      console.error(error);
      setGeneratedSummary("Não foi possível gerar o resumo. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <Card className="shadow-lg border-2 border-purple-200">
        <CardContent className="p-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Analisando seu diagnóstico...
            </h3>
            <p className="text-gray-600">
              Nossa IA está gerando insights personalizados para sua oficina
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6" />
            Resumo Executivo do Diagnóstico
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            disabled={isGenerating}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold text-purple-900 mb-3 mt-6 pb-2 border-b-2 border-purple-200 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="space-y-3 mb-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="space-y-3 mb-4">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold mt-0.5">
                    ✓
                  </span>
                  <span className="text-gray-700 flex-1">{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-purple-900">
                  {children}
                </strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-4 bg-purple-50 rounded-r-lg italic">
                  {children}
                </blockquote>
              ),
            }}
          >
            {generatedSummary}
          </ReactMarkdown>
        </div>

        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <span>
              Este resumo foi gerado por Inteligência Artificial analisando suas respostas específicas. 
              Para um plano de ação completo e detalhado, clique no botão abaixo.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}