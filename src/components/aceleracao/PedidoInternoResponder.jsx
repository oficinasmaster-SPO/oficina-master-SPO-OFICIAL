import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, Activity, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PedidoInternoVisualizador from "./PedidoInternoVisualizador";
import PedidoInternoMediaUpload from "./PedidoInternoMediaUpload";
import TarefaConvertidaBanner from "./banners/TarefaConvertidaBanner";
import ActivityTimeline from "./ActivityTimeline";
import StatusBadge from "@/components/shared/StatusBadge";
import PriorityBadge from "@/components/shared/PriorityBadge";
import { TIPO_PEDIDO_LABELS } from "@/components/shared/backlogConstants";

export default function PedidoInternoResponder({ pedido, user, onCancel, onSuccess }) {
  const [resposta, setResposta] = useState(pedido.resposta || "");
  const [midiasAnexas, setMidiasAnexas] = useState([]);

  const isReadOnly = pedido.status === 'concluido' || pedido.status === 'recusado';

  // H7: Apenas o responsável atribuído ou admin podem responder/aprovar/recusar
  const canRespond = user?.id === pedido.assignee_id || user?.role === 'admin';

  const saveMutation = useMutation({
    mutationFn: async (novoStatus) => {
      const now = new Date().toISOString();
      const midiasExistentes = pedido.midias_anexas || [];
      const updateData = {
        resposta,
        status: novoStatus,
        midias_anexas: [...midiasExistentes, ...midiasAnexas],
      };

      // H3: historico inline removido — ActivityLog registra eventos automaticamente via automação
      if (novoStatus === 'concluido') {
        updateData.data_conclusao = now;
      }

      if (!pedido.data_primeira_resposta) {
        updateData.data_primeira_resposta = now;
      }

      await base44.entities.PedidoInterno.update(pedido.id, updateData);

      // Notificar solicitante
      if (pedido.requester_id) {
        const msg = novoStatus === 'aprovado'
          ? `Seu pedido "${pedido.titulo}" foi aprovado. Uma tarefa foi criada para acompanhamento.`
          : novoStatus === 'recusado'
          ? `Seu pedido "${pedido.titulo}" foi recusado.`
          : `Seu pedido "${pedido.titulo}" teve o status alterado para: ${novoStatus}.`;
        await base44.functions.invoke('notificarPedidoInterno', {
          pedido_id: pedido.id,
          tipo_notificacao: 'response',
          usuario_destino_id: pedido.requester_id,
          mensagem: msg
        });
      }
    },
    onSuccess: (_data, novoStatus) => {
      const messages = {
        aprovado: 'Pedido aprovado! Tarefa criada no backlog.',
        recusado: 'Pedido recusado.',
        concluido: 'Pedido concluído!',
      };
      toast.success(messages[novoStatus] || 'Resposta salva!');
      onSuccess();
    },
    onError: () => toast.error('Erro ao salvar resposta')
  });

  return (
    <div className="space-y-6">
      {/* Dados do pedido (read-only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-lg">{pedido.titulo}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Solicitado por <strong>{pedido.requester_name}</strong>
                {pedido.workshop_nome && <> · Cliente: <strong>{pedido.workshop_nome}</strong></>}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge entity="pedido" status={pedido.status} />
            <PriorityBadge prioridade={pedido.prioridade} />
            <Badge variant="outline">{TIPO_PEDIDO_LABELS[pedido.tipo] || pedido.tipo}</Badge>
            {pedido.prazo && (
              <Badge variant="outline" className={`flex items-center gap-1 ${new Date(pedido.prazo) < new Date() && pedido.status !== 'concluido' ? 'text-red-600 border-red-300' : ''}`}>
                <Clock className="w-3 h-3" />
                Prazo: {format(new Date(pedido.prazo), 'dd/MM/yyyy', { locale: ptBR })}
              </Badge>
            )}
          </div>

          {pedido.descricao && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">Descrição</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{pedido.descricao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banner de rastreabilidade — pedido convertido em tarefa do backlog */}
      <TarefaConvertidaBanner pedido={pedido} />

      {/* Área de resposta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua Resposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isReadOnly ? (
            <div className={`rounded-lg p-4 border ${pedido.status === 'recusado' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${pedido.status === 'recusado' ? 'text-red-700' : 'text-green-700'}`}>
                {pedido.status === 'recusado' ? 'Pedido recusado' : 'Resposta registrada'}
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{pedido.resposta || '—'}</p>
            </div>
          ) : !canRespond ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Apenas o responsável atribuído pode responder a este pedido.</p>
            </div>
          ) : (
            <>
              <div>
                <Label>Resposta / Resolução *</Label>
                <Textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Descreva sua resposta, decisão ou encaminhamento..."
                  rows={5}
                />
              </div>

              <div>
                <Label className="mb-2 block">Evidências (opcional)</Label>
                <PedidoInternoMediaUpload
                  midias={midiasAnexas}
                  onChange={setMidiasAnexas}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t flex-wrap">
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                {pedido.status !== 'concluido' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => saveMutation.mutate('recusado')}
                      disabled={saveMutation.isPending || !resposta.trim()}
                      className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Recusar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => saveMutation.mutate('aprovado')}
                      disabled={saveMutation.isPending || !resposta.trim()}
                      className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar e Gerar Tarefa
                    </Button>
                    <Button
                      onClick={() => saveMutation.mutate('concluido')}
                      disabled={saveMutation.isPending || !resposta.trim()}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {saveMutation.isPending ? 'Salvando...' : 'Concluir'}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Anexos */}
      <PedidoInternoVisualizador pedido={pedido} />

      {/* H4: Timeline Unificada única — ActivityLog (eventos automáticos) + Comentários */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4" />
            Timeline & Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            entityType="pedido_interno"
            entityId={pedido.id}
            workshopId={pedido.workshop_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}