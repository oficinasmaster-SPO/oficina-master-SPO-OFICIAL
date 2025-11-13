import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { questions } from "../diagnostic/Questions";

export default function GeneratedPlanText({ diagnostic, workshop, actions, subtasks }) {
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (diagnostic && actions.length > 0) {
      generatePlan();
    }
  }, [diagnostic?.id, actions.length]);

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      // Preparar dados das respostas
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

      // Preparar dados das ações
      const actionsJson = actions.map(action => ({
        id: action.id,
        title: action.title,
        description: action.description,
        pillar: getCategoryLabel(action.category),
        status: getStatusLabel(action.status),
        due_date: action.due_date
      }));

      // Preparar dados das subtarefas
      const users = await base44.entities.User.list();
      const subtasksJson = subtasks.map(subtask => ({
        id: subtask.id,
        action_id: subtask.action_id,
        title: subtask.title,
        description: subtask.description || "",
        responsible_name: users.find(u => u.id === subtask.responsible_user_id)?.full_name || "Não atribuído",
        status: getStatusLabel(subtask.status),
        due_date: subtask.due_date
      }));

      // Montar o prompt
      const prompt = `A seguir estão os dados completos de um diagnóstico de oficina.
Use APENAS essas informações para gerar um plano de ação personalizado.

DADOS DA OFICINA

Nome da oficina: ${workshop?.name || "Não informado"}
Cidade/Estado: ${workshop?.city || "Não informado"} / ${workshop?.state || "Não informado"}
Segmento: ${workshop?.segment ? workshop.segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}

FASE DA OFICINA

Fase atual: ${diagnostic.phase}
Letra predominante no diagnóstico: ${diagnostic.dominant_letter}

RESPOSTAS DO DIAGNÓSTICO
(cada item contém id da pergunta, texto da pergunta, alternativa marcada e significado resumido)

${JSON.stringify(answersJson, null, 2)}

PLANO DE AÇÃO ESTRUTURADO (AÇÕES E SUBTAREFAS)
Aqui estão as ações e subtarefas já criadas no sistema para esse diagnóstico:

{
  "actions": ${JSON.stringify(actionsJson, null, 2)},
  "subtasks": ${JSON.stringify(subtasksJson, null, 2)}
}

TAREFA: GERAR PLANO DE AÇÃO PERSONALIZADO

Com base SOMENTE nos dados acima, escreva um documento em texto, com a seguinte estrutura:

1. Cabeçalho
   - Nome da oficina, cidade/estado, segmento.
   - Fase atual da oficina + 1 frase explicando essa fase.

2. Resumo do diagnóstico da sua oficina
   - Explique, em linguagem simples, como está a situação da oficina HOJE, usando diretamente as respostas do diagnóstico.
   - Cite explicitamente alguns pontos principais das respostas.

3. Objetivo principal dos próximos 90 dias
   - Defina 1 objetivo central coerente com a fase e com as respostas.

4. Direcionamentos por pilar
   Para cada pilar relevante (Vendas e Atendimento GPS, Prospecção Ativa P.A.V.E, Precificação R70/I30 + TCMP2, Pessoas e Time CESP):
   - Descreva a situação atual com base nas respostas do diagnóstico.
   - Conecte as ações e subtarefas desse pilar, explicando o que será feito.

5. Plano por prazo
   - Organize as ações em: Curto prazo (até 30 dias), Médio prazo (31 a 90 dias), Longo prazo (acima de 90 dias).

6. Indicadores que você deve acompanhar
   - Liste de 3 a 6 indicadores prioritários para essa oficina.

7. Próximos passos para esta semana
   - Liste de 3 a 5 próximos passos práticos, baseados nas ações com prazo mais próximo.

IMPORTANTE:
- Fale sempre em 2ª pessoa ("você", "sua oficina").
- Não invente nenhum dado que não esteja nas informações fornecidas.
- Deixe o texto fluido e fácil de ler.
- Use markdown para formatação (títulos ##, listas -, negrito **).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedText(result);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar plano personalizado");
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      vendas: "Vendas e Atendimento",
      prospeccao: "Prospecção Ativa",
      precificacao: "Precificação e Rentabilidade",
      pessoas: "Pessoas e Time"
    };
    return labels[category] || category;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'a_fazer': 'A Fazer',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído'
    };
    return labels[status];
  };

  if (isGenerating) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Gerando seu plano personalizado...
            </h3>
            <p className="text-gray-600">
              Estamos analisando seu diagnóstico e criando recomendações específicas para sua oficina.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Plano de Ação Personalizado
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generatePlan}
            disabled={isGenerating}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regerar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-6">{children}</h1>,
              h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-900 mb-3 mt-6 border-b-2 border-blue-200 pb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">{children}</h3>,
              p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">{children}</ol>,
              li: ({ children }) => <li className="ml-4">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 rounded-r-lg">
                  {children}
                </blockquote>
              ),
            }}
          >
            {generatedText}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}