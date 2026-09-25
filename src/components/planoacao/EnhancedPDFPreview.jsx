import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import { questions } from "../diagnostic/Questions";
import { PHASE_INFO } from "../lib/phaseConstants";

export default function EnhancedPDFPreview({ diagnostic, workshop, actions, subtasks, aiSuggestions }) {
  const [pdfContent, setPdfContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateEnhancedPDF();
  }, []);

  const generateEnhancedPDF = async () => {
    try {
      // Preparar dados do diagnóstico
      const answersJson = diagnostic.answers.map(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        const option = question?.options.find(opt => opt.letter === answer.selected_option);
        
        return {
          pergunta: question?.question || "",
          resposta: option?.text || ""
        };
      });

      const prompt = `Gere um plano de ação COMPLETO e PROFISSIONAL em formato de texto estruturado para PDF.

DADOS DA OFICINA:
Nome: ${workshop?.name || "Não informado"}
Localização: ${workshop?.city || "Não informado"}, ${workshop?.state || "Não informado"}
Segmento: ${workshop?.segment ? workshop.segment.replace(/_/g, ' ') : "Não informado"}
Faturamento: ${workshop?.monthly_revenue || "Não informado"}
Colaboradores: ${workshop?.employees_count || "Não informado"}
Tempo de mercado: ${workshop?.years_in_business || "Não informado"}

FASE IDENTIFICADA: Fase ${diagnostic.phase}

DESAFIOS IDENTIFICADOS PELA IA:
${aiSuggestions?.desafios_identificados ? JSON.stringify(aiSuggestions.desafios_identificados, null, 2) : "Não disponível"}

AÇÕES PRIORITÁRIAS SUGERIDAS:
${aiSuggestions?.acoes_prioritarias ? JSON.stringify(aiSuggestions.acoes_prioritarias, null, 2) : "Não disponível"}

MÉTRICAS RECOMENDADAS:
${aiSuggestions?.metricas_acompanhar ? JSON.stringify(aiSuggestions.metricas_acompanhar, null, 2) : "Não disponível"}

RESPOSTAS DO DIAGNÓSTICO:
${JSON.stringify(answersJson, null, 2)}

---

Crie um documento completo, profissional e detalhado com as seguintes seções:

**PLANO DE AÇÃO ESTRATÉGICO - ${workshop?.name || "Oficina"}**

**1. SUMÁRIO EXECUTIVO**
Faça um resumo de 3-4 parágrafos sobre a situação atual da oficina, fase identificada e próximos passos prioritários.

**2. ANÁLISE DA SITUAÇÃO ATUAL**
Com base nas respostas do diagnóstico, descreva em detalhes:
- Situação atual do negócio
- Principais pontos fortes identificados
- Principais desafios e gaps
- Oportunidades de melhoria

**3. DESAFIOS PRIORITÁRIOS**
Liste e explique detalhadamente os desafios identificados, com base nos dados da IA.

**4. PLANO DE AÇÃO DETALHADO**

Para cada ação prioritária sugerida pela IA, forneça:
- Nome da ação
- Objetivo claro
- Passos de implementação detalhados
- Prazo sugerido
- Benefícios esperados
- Recursos necessários

**5. CRONOGRAMA DE IMPLEMENTAÇÃO**

Organize as ações em:
- Curto prazo (0-30 dias): Ações urgentes
- Médio prazo (31-90 dias): Consolidação
- Longo prazo (91+ dias): Crescimento sustentável

**6. INDICADORES DE DESEMPENHO (KPIs)**

Liste as métricas essenciais que devem ser acompanhadas, com:
- Nome do indicador
- Como medir
- Meta sugerida para 90 dias
- Frequência de acompanhamento

**7. PRÓXIMOS PASSOS IMEDIATOS (ESTA SEMANA)**

Liste 5-7 ações concretas que podem ser iniciadas imediatamente.

**8. RECOMENDAÇÕES FINAIS**

Insights personalizados e orientações estratégicas para o sucesso do plano.

---

IMPORTANTE:
- Use linguagem profissional mas acessível
- Seja específico e prático
- Baseie-se exclusivamente nos dados fornecidos
- Estruture com títulos e subtítulos claros
- Use formatação para facilitar a leitura no PDF
- Texto corrido, sem markdown (use apenas MAIÚSCULAS para títulos)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setPdfContent(result);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setPdfContent("Erro ao gerar conteúdo do plano de ação.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Sprint 2 / A2: nomes oficiais das fases (fonte única: phaseConstants)
  const getPhaseDescription = (phase) => {
    const info = PHASE_INFO[phase];
    return info ? `Fase ${phase}: ${info.name} — ${info.title}` : "";
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

  const getSubtasksForAction = (actionId) => {
    return subtasks.filter(s => s.action_id === actionId);
  };

  return (
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
          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-white p-8 max-w-4xl mx-auto">
        {/* Capa */}
        <div className="text-center mb-12 pb-12 border-b-4 border-blue-600">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl text-white font-bold">📋</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              PLANO DE AÇÃO ESTRATÉGICO
            </h1>
            <p className="text-2xl text-gray-700 mb-6">
              {workshop?.name || "Oficina"}
            </p>
            <p className="text-lg text-gray-600">
              Programa de Aceleração - Oficinas Master
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg inline-block">
            <p className="text-sm text-gray-600 mb-2">Data de Geração</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Informações da Oficina */}
        <div className="mb-10 avoid-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-300">
            INFORMAÇÕES DA OFICINA
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nome da Oficina</p>
                <p className="font-bold text-gray-900 text-lg">{workshop?.name || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Localização</p>
                <p className="font-bold text-gray-900 text-lg">
                  {workshop ? `${workshop.city}, ${workshop.state}` : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Segmento</p>
                <p className="font-bold text-gray-900">
                  {workshop?.segment ? workshop.segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Faturamento Mensal</p>
                <p className="font-bold text-gray-900">
                  {workshop?.monthly_revenue ? workshop.monthly_revenue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Colaboradores</p>
                <p className="font-bold text-gray-900">
                  {workshop?.employees_count ? workshop.employees_count.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tempo de Mercado</p>
                <p className="font-bold text-gray-900">
                  {workshop?.years_in_business ? workshop.years_in_business.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Não informado"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fase Identificada */}
        <div className="mb-10 avoid-break">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-8 border-green-600 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {getPhaseDescription(diagnostic.phase)}
            </h2>
            <p className="text-sm text-gray-600">
              Data do Diagnóstico: {format(new Date(diagnostic.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Conteúdo Gerado por IA */}
        <div className="page-break"></div>
        
        {isGenerating ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Gerando plano de ação detalhado...</p>
            <p className="text-gray-500 text-sm mt-2">Isso pode levar alguns instantes</p>
          </div>
        ) : (
          <div className="mb-12 text-gray-800 leading-relaxed whitespace-pre-wrap text-justify">
            {pdfContent}
          </div>
        )}

        {/* Detalhamento de Ações e Subtarefas */}
        {actions.length > 0 && (
          <>
            <div className="page-break"></div>
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-4 border-gray-300">
                DETALHAMENTO DAS AÇÕES E SUBTAREFAS
              </h2>

              {actions.map((action, index) => {
                const actionSubtasks = getSubtasksForAction(action.id);
                
                return (
                  <div key={action.id} className="mb-8 avoid-break">
                    <div className="bg-gray-50 border-l-4 border-blue-600 p-6 rounded-lg mb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-bold text-gray-900">
                              {action.title}
                            </h3>
                            <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full font-semibold">
                              {getStatusLabel(action.status)}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                              📂 {getCategoryLabel(action.category)}
                            </span>
                          </div>

                          <p className="text-gray-700 leading-relaxed mb-3 text-justify">
                            {action.description}
                          </p>

                          {action.due_date && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-semibold">📅 Prazo:</span>
                              <span>{format(new Date(action.due_date), "dd/MM/yyyy")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {actionSubtasks.length > 0 && (
                      <div className="ml-12 space-y-3">
                        <h4 className="font-bold text-gray-800 mb-3 text-lg">Subtarefas:</h4>
                        {actionSubtasks.map((subtask, subIndex) => (
                          <div key={subtask.id} className="border-l-4 border-blue-300 pl-5 py-3 bg-white rounded-r-lg">
                            <div className="flex items-start gap-3">
                              {subtask.status === 'concluido' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                              ) : subtask.status === 'em_andamento' ? (
                                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1">
                                <p className={`font-semibold text-base mb-1 ${
                                  subtask.status === 'concluido' ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}>
                                  {subIndex + 1}. {subtask.title}
                                </p>
                                {subtask.description && (
                                  <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                                    {subtask.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                                  <span>📊 Status: {getStatusLabel(subtask.status)}</span>
                                  {subtask.due_date && (
                                    <span>📅 Vence: {format(new Date(subtask.due_date), "dd/MM/yyyy")}</span>
                                  )}
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
          </>
        )}

        {/* Rodapé */}
        <div className="mt-16 pt-8 border-t-4 border-gray-300 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl text-white">📋</span>
            </div>
            <p className="font-bold text-lg text-gray-900 mb-1">
              Oficinas Master
            </p>
            <p className="text-gray-600">
              Programa de Aceleração de Oficinas
            </p>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              Documento gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs mt-4 max-w-2xl mx-auto leading-relaxed">
              Este plano de ação foi gerado com base nas respostas do diagnóstico e análise de inteligência artificial.
              Recomenda-se revisão periódica e ajustes conforme a evolução do negócio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}