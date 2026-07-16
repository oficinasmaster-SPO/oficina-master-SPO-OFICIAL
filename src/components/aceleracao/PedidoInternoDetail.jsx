import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ActivityTimeline from "./ActivityTimeline";
import PedidoInternoStepper from "./PedidoInternoStepper";
import PedidoInternoDataSidebar from "./PedidoInternoDataSidebar";
import StatusBadge from "@/components/shared/StatusBadge";

export default function PedidoInternoDetail({ pedido, user, onCancel, onSuccess, onDelete }) {
  const [resposta, setResposta] = useState(pedido.resposta || "");
  const [showResposta, setShowResposta] = useState(false);

  const isReadOnly = pedido.status === "concluido" || pedido.status === "recusado";
  const canRespond = user?.id === pedido.assignee_id || user?.role === "admin";
  const canDelete = user?.role === "admin";

  const saveMutation = useMutation({
    mutationFn: async (novoStatus) => {
      const now = new Date().toISOString();
      const midiasExistentes = pedido.midias_anexas || [];
      const updateData = {
        resposta,
        status: novoStatus,
        midias_anexas: [...midiasExistentes],
      };
      if (novoStatus === "concluido") updateData.data_conclusao = now;
      if (!pedido.data_primeira_resposta) updateData.data_primeira_resposta = now;
      await base44.entities.PedidoInterno.update(pedido.id, updateData);
      if (pedido.requester_id) {
        const msg = novoStatus === "aprovado"
          ? `Seu pedido "${pedido.titulo}" foi aprovado.`
          : novoStatus === "recusado"
          ? `Seu pedido "${pedido.titulo}" foi recusado.`
          : `Seu pedido "${pedido.titulo}" teve o status alterado para: ${novoStatus}.`;
        await base44.functions.invoke("notificarPedidoInterno", {
          pedido_id: pedido.id,
          tipo_notificacao: "response",
          usuario_destino_id: pedido.requester_id,
          mensagem: msg,
        });
      }
    },
    onSuccess: (_data, novoStatus) => {
      const messages = {
        aprovado: "Pedido aprovado! Tarefa criada no backlog.",
        recusado: "Pedido recusado.",
        concluido: "Pedido concluído!",
      };
      toast.success(messages[novoStatus] || "Resposta salva!");
      onSuccess();
    },
    onError: () => toast.error("Erro ao salvar resposta"),
  });

  const handleStatusAction = (status) => {
    if (!resposta.trim()) {
      setShowResposta(true);
      toast.info("Descreva sua resposta antes de prosseguir.");
      return;
    }
    saveMutation.mutate(status);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      await base44.entities.PedidoInterno.delete(pedido.id);
      toast.success("Pedido excluído.");
      onDelete?.();
    } catch {
      toast.error("Erro ao excluir pedido.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Pedido #{pedido.id?.slice(-6)?.toUpperCase()}
            </h2>
            <p className="truncate text-xs text-gray-500">{pedido.titulo}</p>
          </div>
        </div>
        <StatusBadge entity="pedido" status={pedido.status} />
      </div>

      {/* Stepper */}
      <div className="border-b border-gray-200 px-5 py-3">
        <PedidoInternoStepper status={pedido.status} />
      </div>

      {/* Resposta bar (expandable, only for canRespond) */}
      {canRespond && !isReadOnly && showResposta && (
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-600">Resposta / Resolução</Label>
            <button onClick={() => setShowResposta(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          </div>
          <Textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Descreva sua resposta, decisão ou encaminhamento..."
            rows={3}
            className="mt-1.5 text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Main split 70/30 */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Timeline (70%) */}
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200">
          <div className="border-b border-gray-100 px-5 py-2">
            <h3 className="text-sm font-bold text-gray-700">Timeline</h3>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-2">
            <ActivityTimeline
              entityType="pedido_interno"
              entityId={pedido.id}
              workshopId={pedido.workshop_id}
              maxHeight="100%"
            />
          </div>
        </div>

        {/* Right: Data Sidebar (30%) */}
        <div className="w-[300px] shrink-0 overflow-y-auto bg-gray-50 p-3">
          <PedidoInternoDataSidebar pedido={pedido} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-gray-500">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canRespond && !isReadOnly ? (
            <>
              {!showResposta && (
                <Button variant="outline" size="sm" onClick={() => setShowResposta(true)}>
                  Escrever Resposta
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusAction("recusado")}
                disabled={saveMutation.isPending}
                className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Recusar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusAction("aprovado")}
                disabled={saveMutation.isPending}
                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4" />
                Aprovar
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusAction("concluido")}
                disabled={saveMutation.isPending}
                className="gap-1.5 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Concluir
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}