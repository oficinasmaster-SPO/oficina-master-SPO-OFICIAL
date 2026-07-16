import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PedidoInternoVisualizador from "./PedidoInternoVisualizador";
import PedidoInternoMediaUpload from "./PedidoInternoMediaUpload";
import TarefaConvertidaBanner from "./banners/TarefaConvertidaBanner";

const STATUS_LABELS = {
  pendente: { label: "Pendente", className: "bg-gray-100 text-gray-800" },
  em_analise: { label: "Em Análise", className: "bg-blue-100 text-blue-800" },
  aprovado: { label: "Aprovado", className: "bg-green-100 text-green-800" },
  recusado: { label: "Recusado", className: "bg-red-100 text-red-800" },
  concluido: { label: "Concluído", className: "bg-purple-100 text-purple-800" },
};

const TIPO_LABELS = {
  apoio_tecnico: "Apoio Técnico",
  decisao_estrategica: "Decisão Estratégica",
  liberacao_material: "Liberação de Material",
  excecao_escopo: "Exceção de Escopo",
  outros: "Outros",
};

const PRIORIDADE_LABELS = {
  baixa: { label: "Baixa", className: "bg-blue-100 text-blue-800" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-800" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-800" },
};

export default function PedidoInternoResponder({ pedido, user, onCancel, onSuccess }) {
  const [resposta, setResposta] = useState(pedido.resposta || "");
  const [midiasAnexas, setMidiasAnexas] = useState([]);

  const isReadOnly = pedido.status === 'concluido';
  const statusBadge = STATUS_LABELS[pedido.status] || STATUS_LABELS.pendente;
  const prioridadeBadge = PRIORIDADE_LABELS[pedido.prioridade] || PRIORIDADE_LABELS.media;

  const saveMutation = useMutation({
    mutationFn: async (novoStatus) => {
      const now = new Date().toISOString();
      const historicoAtual = pedido.historico || [];
      const novasEntradas = [];

      novasEntradas.push({
        acao: 'STATUS_CHANGE',
        campo: 'status',
        valor_anterior: pedido.status,
        valor_novo: novoStatus,
        usuario_id: user?.id,
        usuario_nome: user?.full_name,
        timestamp: now
      });

      if (resposta && resposta !== pedido.resposta) {
        novasEntradas.push({
          acao: 'RESPONSE',
          campo: 'resposta',
          valor_anterior: pedido.resposta || '',
          valor_novo: resposta,
          usuario_id: user?.id,
          usuario_nome: user?.full_name,
          timestamp: now
        });
      }

      const midiasExistentes = pedido.midias_anexas || [];
      const updateData = {
        resposta,
        status: novoStatus,
        historico: [...historicoAtual, ...novasEntradas],
        midias_anexas: [...midiasExistentes, ...midiasAnexas],
      };

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
      toast.success(novoStatus === 'aprovado' ? 'Pedido aprovado! Tarefa criada no backlog.' : 'Resposta salva!');
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
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
            <Badge className={prioridadeBadge.className}>{prioridadeBadge.label}</Badge>
            <Badge variant="outline">{TIPO_LABELS[pedido.tipo] || pedido.tipo}</Badge>
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-700 mb-1">Resposta registrada</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{pedido.resposta || '—'}</p>
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

              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                {pedido.status !== 'concluido' && (
                  <>
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

      {/* Histórico */}
      {pedido?.historico?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" />
              Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...pedido.historico].reverse().map((entry, idx) => (
                <div key={idx} className="flex gap-3 text-sm border-b pb-3 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">
                      {entry.acao === 'CREATE' && 'Pedido criado'}
                      {entry.acao === 'STATUS_CHANGE' && `Status: ${entry.valor_anterior} → ${entry.valor_novo}`}
                      {entry.acao === 'RESPONSE' && 'Resposta adicionada'}
                      {entry.acao === 'UPDATE' && `Campo "${entry.campo}" atualizado`}
                    </p>
                    {entry.usuario_nome && <p className="text-gray-500 text-xs">por {entry.usuario_nome}</p>}
                    {entry.timestamp && (
                      <p className="text-gray-400 text-xs">
                        {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}