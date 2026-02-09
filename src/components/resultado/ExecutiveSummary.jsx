import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw, Target, TrendingUp, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { questions } from "../diagnostic/Questions";

export default function ExecutiveSummary({ diagnostic, workshop, phaseDistribution }) {
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (diagnostic && phaseDistribution) {
      generateSummary();
    }
  }, [diagnostic?.id]);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
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

      const dominantPhase = phaseDistribution.reduce((prev, current) => 
        current.count > prev.count ? current : prev
      );

      const secondaryPhases = phaseDistribution
        .filter(p => p.percent >= 15 && p.phase !== dominantPhase.phase)
        .sort((a, b) => b.percent - a.percent)
        .map(p => `Fase ${p.phase} (${p.percent}%)`);

      const prompt = `Você é um consultor especialista em gestão de oficinas automotivas.

DADOS DA OFICINA:
Nome: ${workshop?.name || "Não informado"}
Cidade/Estado: ${workshop?.city || "Não informado"} / ${workshop?.state || "Não informado"}
Segmento: ${workshop?.segment ? workshop.segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}

RESULTADO DO DIAGNÓSTICO:
Fase Principal: Fase ${dominantPhase.phase} (${dominantPhase.percent}% das respostas)
${secondaryPhases.length > 0 ? `Características Secundárias: ${secondaryPhases.join(', ')}` : ''}

RESPOSTAS DO QUESTIONÁRIO:
${JSON.stringify(answersJson, null, 2)}

TAREFA: Crie um RESUMO EXECUTIVO CONCISO (máximo 4 parágrafos) que contenha:

1. **Situação Atual** (1-2 frases)
   - Descreva de forma direta como está a oficina hoje com base nas respostas mais relevantes do diagnóstico.

2. **Diagnóstico Principal** (1 parágrafo)
   - Explique o que caracteriza a Fase ${dominantPhase.phase} e por que as respostas indicam que a oficina está nesta fase.
   ${secondaryPhases.length > 0 ? `- Mencione brevemente as características secundárias identificadas.` : ''}

3. **Principais Desafios** (3-4 bullets)
   - Liste os 3-4 desafios mais críticos que essa oficina enfrenta AGORA, baseado nas respostas.

4. **Próximos Passos Imediatos** (3-4 bullets)
   - Liste 3-4 ações prioritárias e práticas para os próximos 30 dias.

REGRAS IMPORTANTES:
- Seja DIRETO e OBJETIVO - nada de enrolação
- Fale sempre em 2ª pessoa ("você", "sua oficina")
- Use APENAS informações das respostas fornecidas
- Seja específico e prático
- Use markdown para formatação: negrito **, listas com -
- Máximo de 400 palavras no total`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedText(result);
    } catch (error) {
      console.error(error);
      setGeneratedText("Erro ao gerar resumo executivo. Por favor, tente novamente.");
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
              Gerando Resumo Executivo...
            </h3>
            <p className="text-gray-600">
              Analisando suas respostas e criando recomendações personalizadas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6" />
            Resumo Executivo - Análise IA
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            disabled={isGenerating}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regerar
          </Button>
        </div>
        <p className="text-purple-100 text-sm mt-2">
          Análise personalizada baseada nas suas respostas
        </p>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-gray-900 mb-3 mt-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-purple-600" />
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold text-gray-900 mb-3 mt-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 leading-relaxed mb-4 text-base">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="space-y-2 mb-4 text-gray-700">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 ml-2">
                  <span className="text-purple-600 font-bold mt-1">•</span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-gray-900 bg-purple-100 px-1 rounded">
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
            {generatedText}
          </ReactMarkdown>
        </div>

        <div className="mt-6 pt-6 border-t border-purple-200">
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-gray-700 leading-relaxed">
                <strong>Este é um resumo inicial.</strong> Ao acessar seu Plano de Ação completo, você terá 
                acesso a um plano detalhado com todas as ações, subtarefas, prazos e responsáveis, além de 
                direcionamentos específicos por pilar de gestão (Vendas, Prospecção, Precificação e Pessoas).
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}