import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, User, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, FileText, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import CompletionModal from "@/components/cronograma/CompletionModal";

export default function ClientDetailPanel({ client, processos, onClose, onAvaliar }) {
  const queryClient = useQueryClient();
  const [activityToComplete, setActivityToComplete] = useState(null);

  // Carregar progressos do cliente
  const { data: progressosCliente = [] } = useQuery({
    queryKey: ['progressos-cliente', client.id],
    queryFn: () => base44.entities.CronogramaProgresso.filter({ workshop_id: client.id })
  });

  const handleOpenCompletionModal = (processo, progresso) => {
    setActivityToComplete({
      id: progresso?.id,
      title: processo.nome || processo.codigo,
      moduloCodigo: processo.codigo,
      workshop_id: client.id,
      source: 'cronograma'
    });
  };

  const handleCompleteActivity = async (activityId, completionData, source) => {
    try {
      if (activityId) {
        // Atualizar progresso existente
        await base44.entities.CronogramaProgresso.update(activityId, {
          situacao: 'concluido',
          data_conclusao_realizado: completionData.completion_date,
          observacoes: completionData.completion_notes,
          avaliacao_efetividade: completionData.effectiveness_rating,
          participantes: completionData.participants_list,
          evidencia_url: completionData.evidence_url
        });
      } else {
        // Criar novo progresso
        await base44.entities.CronogramaProgresso.create({
          workshop_id: activityToComplete.workshop_id,
          modulo_codigo: activityToComplete.moduloCodigo,
          situacao: 'concluido',
          data_conclusao_realizado: completionData.completion_date,
          observacoes: completionData.completion_notes,
          avaliacao_efetividade: completionData.effectiveness_rating,
          participantes: completionData.participants_list,
          evidencia_url: completionData.evidence_url
        });
      }

      // Notificar outros usuários sobre a conclusão
      const user = await base44.auth.me();
      try {
        await base44.functions.invoke('notificarConclusaoProcesso', {
          workshop_id: activityToComplete.workshop_id,
          processo_titulo: activityToComplete.title,
          concluido_por_id: user.id,
          progresso_id: activityId
        });
      } catch (error) {
        console.error("Erro ao notificar conclusão:", error);
      }
      
      queryClient.invalidateQueries(['progressos-cliente']);
      queryClient.invalidateQueries(['cronograma-progressos']);
      queryClient.invalidateQueries(['workshops-cronograma']);
    } catch (error) {
      console.error("Erro ao concluir processo:", error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Detalhes do Cliente</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4" />
                <span className="font-medium">{client.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{client.city}/{client.state}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <FileText className="w-4 h-4" />
                <span>CNPJ: {client.cnpj || 'Não informado'}</span>
              </div>
              <div className="mt-4">
                <Badge className="bg-blue-100 text-blue-700">
                  Plano {client.planoAtual}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Progresso Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso do Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${client.percentualConclusao || 0}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {client.percentualConclusao || 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cronograma de Processos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cronograma de Processos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processos.map((processo) => {
                  const progresso = progressosCliente.find(p => p.modulo_codigo === processo.codigo);
                  const status = progresso?.situacao || 'nao_iniciado';
                  const isConcluido = status === 'concluido';
                  const isAtrasado = status === 'atrasado';

                  return (
                    <div 
                      key={processo.codigo}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {processo.nome || processo.codigo}
                            </h4>
                            {isConcluido && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Concluído
                              </Badge>
                            )}
                            {isAtrasado && (
                              <Badge className="bg-red-100 text-red-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Atrasado
                              </Badge>
                            )}
                            {!isConcluido && !isAtrasado && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                <Clock className="w-3 h-3 mr-1" />
                                A Fazer
                              </Badge>
                            )}
                          </div>
                          {progresso?.data_conclusao_realizado && (
                            <p className="text-xs text-gray-600">
                              Concluído em: {format(new Date(progresso.data_conclusao_realizado), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!isConcluido && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCompletionModal(processo, progresso)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Concluir
                            </Button>
                          )}
                          {isConcluido && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAvaliar(client, processo)}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Avaliar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Gerar Relatório Completo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" />
                Ver Perfil Completo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Conclusão */}
      {activityToComplete && (
        <CompletionModal
          activity={activityToComplete}
          onClose={() => setActivityToComplete(null)}
          onComplete={handleCompleteActivity}
        />
      )}
    </div>
  );
}