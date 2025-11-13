import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import { questions } from "../diagnostic/Questions";

export default function PDFPreview({ diagnostic, workshop, actions, subtasks, onClose }) {
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generatePlanForPDF();
  }, []);

  const generatePlanForPDF = async () => {
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

${JSON.stringify(answersJson, null, 2)}

PLANO DE AÇÃO ESTRUTURADO (AÇÕES E SUBTAREFAS)

{
  "actions": ${JSON.stringify(actionsJson, null, 2)},
  "subtasks": ${JSON.stringify(subtasksJson, null, 2)}
}

TAREFA: GERAR PLANO DE AÇÃO PERSONALIZADO PARA PDF

Escreva um documento completo e profissional com:

1. Cabeçalho com nome da oficina e fase
2. Resumo do diagnóstico usando as respostas
3. Objetivo principal dos próximos 90 dias
4. Direcionamentos por pilar (Vendas GPS, Prospecção P.A.V.E, Precificação R70/I30, Pessoas CESP)
5. Plano por prazo (curto, médio, longo)
6. Indicadores a acompanhar
7. Próximos passos da semana

Use linguagem em 2ª pessoa, simples e direta. Formato em texto puro sem markdown.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedText(result);
    } catch (error) {
      console.error(error);
      setGeneratedText("Erro ao gerar conteúdo personalizado.");
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

  const getPhaseDescription = (phase) => {
    const descriptions = {
      1: "Fase de Sobrevivência e Geração de Lucro",
      2: "Fase de Crescimento e Ampliação de Time",
      3: "Fase de Organização, Processos e Liderança",
      4: "Fase de Consolidação e Escala"
    };
    return descriptions[phase] || "";
  };

  const getSubtasksForAction = (actionId) => {
    return subtasks.filter(s => s.action_id === actionId);
  };

  return (
    <>
      <div className="hidden print:block">
        <style>{`
          @media print {
            @page {
              margin: 2cm;
              size: A4;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}</style>

        <div className="bg-white p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b-4 border-blue-600 pb-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Plano de Ação Personalizado
                </h1>
                <p className="text-lg text-gray-600">
                  Programa de Aceleração - Oficinas Master
                </p>
              </div>
            </div>
          </div>

          {/* Informações da Oficina */}
          <div className="mb-8 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informações da Oficina</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome da Oficina</p>
                <p className="font-semibold text-gray-900">{workshop?.name || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Localização</p>
                <p className="font-semibold text-gray-900">
                  {workshop ? `${workshop.city}, ${workshop.state}` : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Segmento</p>
                <p className="font-semibold text-gray-900">
                  {workshop?.segment ? workshop.segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data do Diagnóstico</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(diagnostic.created_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Fase Identificada */}
          <div className="mb-8 bg-green-50 border-l-4 border-green-600 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Fase Identificada: Fase {diagnostic.phase}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {getPhaseDescription(diagnostic.phase)}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Letra predominante nas respostas:</span>
              <span className="px-3 py-1 bg-green-600 text-white rounded-full font-bold">
                {diagnostic.dominant_letter}
              </span>
            </div>
          </div>

          {/* Conteúdo Gerado por IA */}
          {isGenerating ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Gerando plano personalizado...</p>
            </div>
          ) : (
            <div className="mb-8 whitespace-pre-wrap text-gray-800 leading-relaxed">
              {generatedText}
            </div>
          )}

          {/* Plano de Ação Detalhado */}
          <div className="page-break">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-gray-300 pb-3">
              Ações e Subtarefas Detalhadas
            </h2>

            {actions.map((action, index) => {
              const actionSubtasks = getSubtasksForAction(action.id);
              
              return (
                <div key={action.id} className="mb-8">
                  <div className="bg-gray-50 p-5 rounded-lg mb-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {action.title}
                          </h3>
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                            {getStatusLabel(action.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          📂 {getCategoryLabel(action.category)}
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-2">
                          {action.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {action.due_date && (
                            <span>📅 Prazo: {format(new Date(action.due_date), "dd/MM/yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {actionSubtasks.length > 0 && (
                    <div className="ml-11 space-y-2">
                      <h4 className="font-semibold text-gray-700 mb-3">Subtarefas:</h4>
                      {actionSubtasks.map((subtask) => (
                        <div key={subtask.id} className="border-l-2 border-blue-300 pl-4 py-2">
                          <div className="flex items-start gap-2">
                            {subtask.status === 'concluido' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : subtask.status === 'em_andamento' ? (
                              <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={`font-medium ${
                                subtask.status === 'concluido' ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}>
                                {subtask.title}
                              </p>
                              {subtask.description && (
                                <p className="text-sm text-gray-600 mt-1">{subtask.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                {subtask.responsible_user_id && (
                                  <span>👤 Responsável: {subtask.responsible_user_id}</span>
                                )}
                                {subtask.due_date && (
                                  <span>📅 Vence: {format(new Date(subtask.due_date), "dd/MM/yyyy")}</span>
                                )}
                                <span>📊 Status: {getStatusLabel(subtask.status)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rodapé */}
          <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
            <p className="mb-2">
              <strong>Oficinas Master</strong> - Programa de Aceleração
            </p>
            <p>
              Documento gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="mt-4 text-xs">
              Este plano de ação foi gerado com base nas respostas do diagnóstico e deve ser revisado periodicamente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}