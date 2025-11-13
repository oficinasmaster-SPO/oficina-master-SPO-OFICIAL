import React, { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export default function PDFPreview({ diagnostic, workshop, actions, subtasks, onClose }) {
  const getPhaseDescription = (phase) => {
    const descriptions = {
      1: "Fase de Sobrevivência e Geração de Lucro - A oficina está focada em gerar lucro imediato para consolidar o negócio, com equipe reduzida e foco em resultados.",
      2: "Fase de Crescimento e Ampliação de Time - A oficina já tem lucro razoável e precisa aumentar a equipe para continuar expandindo.",
      3: "Fase de Organização, Processos e Liderança - A oficina tem equipe formada e precisa estabelecer processos claros e desenvolver liderança.",
      4: "Fase de Consolidação e Escala - A oficina está consolidada com processos estabelecidos e pode focar em planejamento estratégico de longo prazo."
    };
    return descriptions[phase] || "";
  };

  const getCategoryLabel = (category) => {
    const labels = {
      vendas: "Vendas e Atendimento - GPS de Vendas",
      prospeccao: "Prospecção Ativa - P.A.V.E",
      precificacao: "Precificação e Rentabilidade - R70/I30 + TCMP2",
      pessoas: "Pessoas e Time - CESP Contratação Ativa"
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

  useEffect(() => {
    // Quando o componente é montado, preparar para impressão
    document.title = `Plano_de_Acao_${workshop?.name || 'Oficina'}_${format(new Date(), 'yyyy-MM-dd')}`;
  }, []);

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
            <div className="text-right">
              <img 
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=80&fit=crop" 
                alt="Logo" 
                className="h-16 w-auto"
              />
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

        {/* Plano de Ação */}
        <div className="page-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-gray-300 pb-3">
            Plano de Ação Detalhado
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
                        {action.deadline_days && (
                          <span>⏱️ {action.deadline_days} dias</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtarefas */}
                {actionSubtasks.length > 0 && (
                  <div className="ml-11 space-y-2">
                    <h4 className="font-semibold text-gray-700 mb-3">Subtarefas:</h4>
                    {actionSubtasks.map((subtask, subIndex) => (
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
  );
}