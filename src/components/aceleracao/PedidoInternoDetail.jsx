import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle, XCircle, Printer, Trash2,
  User, Clock, AlertTriangle, ArrowUp, Minus, ArrowDown,
  CalendarClock, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ActivityTimeline from "./ActivityTimeline";
import PedidoInternoStepper from "./PedidoInternoStepper";
import PedidoInternoDataSidebar from "./PedidoInternoDataSidebar";
import { PEDIDO_STATUS_CONFIG, PRIORIDADE_CONFIG } from "@/components/shared/backlogConstants";

// ── Helpers ───────────────────────────────────────────────────────────────
const STATUS_PILL = {
  pendente:   "bg-gray-100 text-gray-700 border-gray-200",
  em_analise: "bg-blue-100 text-blue-700 border-blue-200",
  aprovado:   "bg-green-100 text-green-700 border-green-200",
  recusado:   "bg-red-100 text-red-700 border-red-200",
  concluido:  "bg-purple-100 text-purple-700 border-purple-200",
};

function StatusPill({ status }) {
  const cfg   = PEDIDO_STATUS_CONFIG[status];
  const label = cfg?.label || status;
  const cls   = STATUS_PILL[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function PriorityIcon({ prioridade }) {
  if (prioridade === "critica") return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  if (prioridade === "alta")    return <ArrowUp       className="h-3.5 w-3.5 text-orange-500" />;
  if (prioridade === "media")   return <Minus         className="h-3.5 w-3.5 text-yellow-500" />;
  return                               <ArrowDown     className="h-3.5 w-3.5 text-blue-400" />;
}

function Avatar({ name, size = "sm" }) {
  const initials = name
    ? name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const COLORS = [
    "bg-blue-500","bg-violet-500","bg-teal-500","bg-orange-500",
    "bg-pink-500","bg-cyan-500","bg-indigo-500","bg-amber-500",
  ];
  const ci = name ? name.charCodeAt(0) % COLORS.length : 0;
  const dim = size === "md" ? "h-7 w-7 text-[11px]" : "h-6 w-6 text-[10px]";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dim} ${COLORS[ci]}`}>
      {initials}
    </span>
  );
}

function MetaChip({ icon: Icon, label, value, className = "" }) {
  if (!value) return null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PedidoInternoDetail({ pedido, user, onCancel, onSuccess, onDelete }) {
  const [resposta, setResposta]       = useState(pedido.resposta || "");
  const [showResposta, setShowResposta] = useState(false);

  const isReadOnly = ["concluido", "recusado"].includes(pedido.status);
  const canRespond = user?.id === pedido.assignee_id || user?.role === "admin";
  const canDelete  = user?.role === "admin";

  // Datas formatadas
  const criadoEm  = pedido.created_date || pedido.data_criacao;
  const criadoFmt = criadoEm
    ? format(new Date(criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : "—";
  const criadoAgo = criadoEm
    ? formatDistanceToNow(new Date(criadoEm), { locale: ptBR, addSuffix: true })
    : null;
  const prazoFmt = pedido.prazo
    ? format(new Date(pedido.prazo), "dd/MM/yyyy", { locale: ptBR })
    : null;
  const isVencido = pedido.prazo && !isReadOnly && new Date(pedido.prazo) < new Date();

  // SLA simples: tempo desde criação
  const slaLabel = criadoEm
    ? formatDistanceToNow(new Date(criadoEm), { locale: ptBR })
    : null;

  const saveMutation = useMutation({
    mutationFn: async (novoStatus) => {
      const now = new Date().toISOString();
      const updateData = {
        resposta,
        status: novoStatus,
        midias_anexas: pedido.midias_anexas || [],
      };
      if (novoStatus === "concluido") updateData.data_conclusao = now;
      if (!pedido.data_primeira_resposta) updateData.data_primeira_resposta = now;
      await base44.entities.PedidoInterno.update(pedido.id, updateData);
      if (pedido.requester_id) {
        const msg =
          novoStatus === "aprovado"  ? `Seu pedido "${pedido.titulo}" foi aprovado.`  :
          novoStatus === "recusado"  ? `Seu pedido "${pedido.titulo}" foi recusado.`  :
          `Seu pedido "${pedido.titulo}" foi atualizado para: ${novoStatus}.`;
        await base44.functions.invoke("notificarPedidoInterno", {
          pedido_id: pedido.id,
          tipo_notificacao: "response",
          usuario_destino_id: pedido.requester_id,
          mensagem: msg,
        });
      }
    },
    onSuccess: (_data, novoStatus) => {
      const msgs = { aprovado: "Pedido aprovado!", recusado: "Pedido recusado.", concluido: "Pedido concluído!" };
      toast.success(msgs[novoStatus] || "Resposta salva!");
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
    <div className="flex h-full min-h-0 flex-col bg-white">

      {/* ── HEADER RICO ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-gray-200">

        {/* Linha 1: volta + número + título + status */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="mt-0.5 shrink-0 h-7 w-7 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            {/* Número do ticket */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-gray-400">
                <Hash className="h-3 w-3" />
                {pedido.id?.slice(-8).toUpperCase()}
              </span>
              {pedido.tipo && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400">{pedido.tipo?.replace(/_/g, " ")}</span>
                </>
              )}
            </div>
            {/* Título */}
            <h2 className="text-base font-bold leading-snug text-gray-950">
              {pedido.titulo}
            </h2>
          </div>

          <div className="shrink-0 pt-0.5">
            <StatusPill status={pedido.status} />
          </div>
        </div>

        {/* Linha 2: Solicitante | Responsável | SLA | Seguidores */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 pb-3">
          {/* Solicitante */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Solicitante</span>
            <Avatar name={pedido.requester_name} size="sm" />
            <span className="text-xs font-medium text-gray-700">{pedido.requester_name || "—"}</span>
          </div>

          <span className="h-3.5 w-px bg-gray-200" />

          {/* Responsável */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Responsável</span>
            <Avatar name={pedido.assignee_name} size="sm" />
            <span className="text-xs font-medium text-gray-700">{pedido.assignee_name || "—"}</span>
          </div>

          <span className="h-3.5 w-px bg-gray-200" />

          {/* SLA (tempo aberto) */}
          {slaLabel && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[11px] text-gray-400 uppercase tracking-wide">SLA</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                isVencido
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {slaLabel}
              </span>
            </div>
          )}

          {/* Prioridade */}
          <div className="flex items-center gap-1">
            <PriorityIcon prioridade={pedido.prioridade} />
            <span className="text-xs text-gray-500">
              {PRIORIDADE_CONFIG[pedido.prioridade]?.label || "—"}
            </span>
          </div>

          {/* Data criação */}
          <div className="flex items-center gap-1 ml-auto">
            <CalendarClock className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-[11px] text-gray-400">{criadoFmt}</span>
          </div>

          {/* Prazo */}
          {prazoFmt && (
            <div className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium
              ${isVencido ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
              {isVencido ? "⚠ Vencido" : "Prazo"} {prazoFmt}
            </div>
          )}
        </div>

        {/* Linha 3: Stepper de etapas */}
        <div className="border-t border-gray-100 px-5 py-3">
          <PedidoInternoStepper pedido={pedido} canEdit={canRespond && !isReadOnly} />
        </div>
      </div>

      {/* ── RESPOSTA (expandível) ──────────────────────────────────────────── */}
      {canRespond && !isReadOnly && showResposta && (
        <div className="shrink-0 border-b border-gray-200 bg-amber-50/40 px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-700">Resposta / Resolução</Label>
            <button onClick={() => setShowResposta(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          </div>
          <Textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Descreva sua resposta, decisão ou encaminhamento..."
            rows={3}
            className="text-sm"
            autoFocus
          />
        </div>
      )}

      {/* ── SPLIT PRINCIPAL 70/30 ─────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* Esquerda: Timeline */}
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200">
          <div className="shrink-0 border-b border-gray-100 px-5 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atividade</p>
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

        {/* Direita: Sidebar */}
        <div className="w-[280px] shrink-0 overflow-y-auto bg-gray-50 p-3">
          <PedidoInternoDataSidebar pedido={pedido} />
        </div>
      </div>

      {/* ── FOOTER DE AÇÕES ───────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-2.5">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-7 gap-1.5 text-xs text-gray-500">
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 gap-1.5 text-xs text-red-500 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canRespond && !isReadOnly ? (
            <>
              {!showResposta && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowResposta(true)}>
                  Escrever Resposta
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-red-300 text-xs text-red-700 hover:bg-red-50"
                onClick={() => handleStatusAction("recusado")}
                disabled={saveMutation.isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                Recusar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-green-300 text-xs text-green-700 hover:bg-green-50"
                onClick={() => handleStatusAction("aprovado")}
                disabled={saveMutation.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Aprovar
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1.5 bg-green-600 text-xs hover:bg-green-700"
                onClick={() => handleStatusAction("concluido")}
                disabled={saveMutation.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {saveMutation.isPending ? "Salvando..." : "Concluir"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
