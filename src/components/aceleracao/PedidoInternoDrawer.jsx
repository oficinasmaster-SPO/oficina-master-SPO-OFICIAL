import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  X, Edit2, Printer, XCircle, CheckCircle,
  MessageSquare, ListChecks, FileText,
  AlertTriangle,
  Clock, CalendarClock, ChevronLeft, ChevronRight,
  Hash, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ActivityTimeline from "./ActivityTimeline";
import PedidoInternoStepper from "./PedidoInternoStepper";
import AnexoPreviewModal from "./AnexoPreviewModal";
import PriorityBadge from "@/components/shared/PriorityBadge";
import {
  PEDIDO_STATUS_CONFIG,
  TIPO_PEDIDO_LABELS, IMPACTO_CLIENTE_LABELS,
} from "@/components/shared/backlogConstants";
import StatusBadge from "@/components/shared/StatusBadge";

function Avatar({ name, size = "md" }) {
  const initials = name
    ? name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const COLORS = [
    "bg-blue-500","bg-violet-500","bg-teal-500","bg-orange-500",
    "bg-pink-500","bg-cyan-500","bg-indigo-500","bg-amber-500",
  ];
  const ci = name ? name.charCodeAt(0) % COLORS.length : 0;
  const dim = size === "sm"
    ? "h-5 w-5 text-[9px]"
    : size === "lg"
    ? "h-8 w-8 text-sm"
    : "h-6 w-6 text-[10px]";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dim} ${COLORS[ci]}`}>
      {initials}
    </span>
  );
}

const STATUS_PILL_CLS = {
  pendente:   "bg-gray-100 text-gray-700 border-gray-200",
  em_analise: "bg-blue-100 text-blue-700 border-blue-200",
  aprovado:   "bg-green-100 text-green-700 border-green-200",
  recusado:   "bg-red-100 text-red-700 border-red-200",
  concluido:  "bg-purple-100 text-purple-700 border-purple-200",
};

function StatusPill({ status }) {
  const label = PEDIDO_STATUS_CONFIG[status]?.label || status;
  const cls   = STATUS_PILL_CLS[status] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function Tab({ label, icon: Icon, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
        ${active
          ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t after:bg-blue-600"
          : "text-gray-500 hover:text-gray-700"
        }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      {badge > 0 && (
        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold
          ${active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function DetailField({ label, icon: Icon, children, className = "" }) {
  if (!children) return null;
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="mt-0.5 text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}

function TabDetalhes({ pedido, onPreviewMedia }) {
  const medias = pedido?.midias_anexas || [];
  const imagens = medias.filter(m => m.type === "imagem");
  const outros = medias.filter(m => m.type !== "imagem");
  const prazoFmt = pedido.prazo
    ? format(new Date(pedido.prazo), "dd/MM/yyyy", { locale: ptBR })
    : null;
  const isVencido = pedido.prazo
    && !["concluido","recusado"].includes(pedido.status)
    && new Date(pedido.prazo) < new Date();

  return (
    <div className="space-y-5 px-5 py-4">
      {pedido.descricao && (
        <div className="rounded-lg border border-[#e6e6a3] bg-[#FFFF99]/30 p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#999933]">Descrição</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#b3b34d]">{pedido.descricao}</p>
        </div>
      )}

      {pedido.resposta && (
        <div className={`rounded-xl border p-4 ${
          pedido.status === "recusado"
            ? "border-red-200 bg-red-50"
            : "border-green-200 bg-green-50"
        }`}>
          <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${
            pedido.status === "recusado" ? "text-red-500" : "text-green-600"
          }`}>
            {pedido.status === "recusado" ? "Motivo da Recusa" : "Resposta Oficial"}
          </p>
          <p className="whitespace-pre-wrap text-sm text-gray-800">{pedido.resposta}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <DetailField label="Cliente" icon={Building2}>
          {pedido.workshop_nome || "—"}
        </DetailField>
        <DetailField label="Categoria" icon={FileText}>
          {TIPO_PEDIDO_LABELS[pedido.tipo] || pedido.tipo || "—"}
        </DetailField>
        <DetailField label="Prioridade">
          <PriorityBadge prioridade={pedido.prioridade} />
        </DetailField>
        <DetailField label="Prazo" icon={Clock}>
          {prazoFmt
            ? <span className={isVencido ? "font-semibold text-red-600" : ""}>{prazoFmt}</span>
            : "—"}
        </DetailField>
        {pedido.impacto_cliente && (
          <DetailField label="Impacto no Cliente" icon={AlertTriangle}>
            {IMPACTO_CLIENTE_LABELS[pedido.impacto_cliente] || pedido.impacto_cliente}
          </DetailField>
        )}
        {pedido.data_conclusao && (
          <DetailField label="Concluído em" icon={CheckCircle}>
            <span className="text-green-700 font-medium">
              {format(new Date(pedido.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </DetailField>
        )}
      </div>

      {medias.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Anexos ({medias.length})
          </p>
          {imagens.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {imagens.map((m, i) => (
                <button
                  key={i}
                  onClick={() => onPreviewMedia?.(m)}
                  className="group relative rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <img src={m.url} alt={m.nome} className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          )}
          {outros.length > 0 && (
            <div className="space-y-1.5">
              {outros.map((m, i) => (
                <button
                  key={i}
                  onClick={() => onPreviewMedia?.(m)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-left hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-xs font-medium text-gray-700">{m.nome}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {m.type === "link" ? "Link" : "Arquivo"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabTarefas({ pedido }) {
  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas-pedido", pedido.id],
    queryFn: async () => {
      const r = await base44.entities.TarefaBacklog.filter(
        { origin_type: "pedido", origin_id: pedido.id },
        "-created_date", 50
      );
      return Array.isArray(r) ? r : [];
    },
    enabled: !!pedido.id,
  });

  const done  = tarefas.filter(t => t.status === "concluida").length;
  const total = tarefas.length;

  return (
    <div className="px-5 py-4">
      {total > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: total > 0 ? `${Math.round(done/total*100)}%` : "0%" }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">{done}/{total} concluídas</span>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_,i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
          <ListChecks className="mb-2 h-8 w-8 text-gray-200" />
          <p className="text-sm">Nenhuma tarefa gerada</p>
          {pedido.status === "aprovado" && (
            <p className="mt-1 text-xs text-blue-500">Pedido aprovado — você pode gerar tarefas na aba Backlog</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tarefas.map(t => (
            <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors
              ${t.status === "concluida" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                ${t.status === "concluida" ? "bg-green-500" : "bg-gray-200"}`}>
                {t.status === "concluida"
                  ? <CheckCircle className="h-3 w-3 text-white" />
                  : <span className="h-2 w-2 rounded-full bg-gray-400" />}
              </span>
              <span className={`flex-1 truncate text-sm ${t.status === "concluida" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                {t.titulo}
              </span>
              <StatusBadge entity="tarefa" status={t.status} className="text-[9px] shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PedidoInternoDrawer({
  pedido,
  user,
  totalPedidos = 0,
  currentIndex = 0,
  onNavigate,
  onClose,
  onEdit,
  onSuccess,
}) {
  const [activeTab, setActiveTab]     = useState("atividade");
  const [previewMedia, setPreviewMedia] = useState(null);
  const queryClient                  = useQueryClient();

  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas-pedido", pedido.id],
    queryFn: async () => {
      const r = await base44.entities.TarefaBacklog.filter(
        { origin_type: "pedido", origin_id: pedido.id }, "-created_date", 50
      );
      return Array.isArray(r) ? r : [];
    },
    enabled: !!pedido.id,
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowUp"   && onNavigate) onNavigate("prev");
      if (e.key === "ArrowDown" && onNavigate) onNavigate("next");
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, onNavigate]);

  const isReadOnly  = ["concluido", "recusado"].includes(pedido.status);
  const isInternal  = user?.user_type === "internal" || user?.data?.user_type === "internal";
  const canRespond  = user?.id === pedido.assignee_id || user?.role === "admin" || isInternal;
  const canEdit     = canRespond;

  const criadoEm   = pedido.created_date || pedido.data_criacao;
  const criadoFmt  = criadoEm
    ? format(new Date(criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : "—";
  const slaLabel   = criadoEm
    ? formatDistanceToNow(new Date(criadoEm), { locale: ptBR })
    : null;
  const isVencido  = pedido.prazo
    && !isReadOnly
    && new Date(pedido.prazo) < new Date();

  const NEXT_STATUS = { pendente: "em_analise", em_analise: "aprovado", aprovado: "concluido" };
  const NEXT_LABEL = { pendente: "Iniciar Análise", em_analise: "Aprovar", aprovado: "Concluir" };
  const nextStatus = NEXT_STATUS[pedido.status];

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const data = { status: nextStatus };
      if (nextStatus === "concluido") data.data_conclusao = new Date().toISOString();
      return base44.entities.PedidoInterno.update(pedido.id, data);
    },
    onSuccess: () => { toast.success("Status atualizado!"); queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] }); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const recusarMutation = useMutation({
    mutationFn: async () => base44.entities.PedidoInterno.update(pedido.id, {
      status: "recusado",
      data_primeira_resposta: pedido.data_primeira_resposta || new Date().toISOString(),
    }),
    onSuccess: () => {
      toast.success("Pedido recusado.");
      queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao recusar"),
  });

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[700px] flex-col bg-white shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-right duration-200">

        <div className="shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            {onNavigate && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onNavigate("prev")}
                  disabled={currentIndex === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  title="Pedido anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-gray-400 px-1">
                  {currentIndex + 1}/{totalPedidos}
                </span>
                <button
                  onClick={() => onNavigate("next")}
                  disabled={currentIndex === totalPedidos - 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  title="Próximo pedido"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <span className="font-mono text-[11px] text-gray-400 shrink-0">
              #{pedido.id?.slice(-8).toUpperCase()}
            </span>

            <div className="ml-auto flex items-center gap-1">
              {canEdit && onEdit && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => onEdit(pedido)}
                  className="h-7 gap-1.5 px-2 text-xs text-gray-500"
                >
                  <Edit2 className="h-3 w-3" /> Editar
                </Button>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-2">
            <h2 className={`min-w-0 flex-1 text-base font-bold leading-snug ${
              isReadOnly ? "text-gray-400" : "text-gray-950"
            }`}>
              {pedido.titulo}
            </h2>
            <StatusPill status={pedido.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">De</span>
              <Avatar name={pedido.requester_name} size="sm" />
              <span className="font-medium text-gray-700">{pedido.requester_name || "—"}</span>
            </div>

            <span className="h-3 w-px bg-gray-200" />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Para</span>
              <Avatar name={pedido.assignee_name} size="sm" />
              <span className="font-medium text-gray-700">{pedido.assignee_name || "—"}</span>
            </div>

            <span className="h-3 w-px bg-gray-200" />

            <PriorityBadge prioridade={pedido.prioridade} />

            {slaLabel && (
              <>
                <span className="h-3 w-px bg-gray-200" />
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold
                    ${isVencido ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                    {slaLabel}
                  </span>
                </div>
              </>
            )}

            <div className="ml-auto flex items-center gap-1 text-gray-400">
              <CalendarClock className="h-3 w-3" />
              <span className="text-[10px]">{criadoFmt}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5">
            <PedidoInternoStepper pedido={pedido} />
          </div>

          <div className="flex border-t border-gray-100 px-2">
            <Tab
              label="Atividade"
              icon={MessageSquare}
              active={activeTab === "atividade"}
              onClick={() => setActiveTab("atividade")}
            />
            <Tab
              label="Detalhes"
              icon={FileText}
              active={activeTab === "detalhes"}
              onClick={() => setActiveTab("detalhes")}
            />
            <Tab
              label="Tarefas"
              icon={ListChecks}
              badge={tarefas.length}
              active={activeTab === "tarefas"}
              onClick={() => setActiveTab("tarefas")}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === "atividade" && (
            <div className="flex flex-col gap-4 px-5 py-4">
              <ActivityTimeline
                entityType="pedido_interno"
                entityId={pedido.id}
                workshopId={pedido.workshop_id}
                maxHeight="100%"
              />
            </div>
          )}

          {activeTab === "detalhes" && <TabDetalhes pedido={pedido} onPreviewMedia={setPreviewMedia} />}

          {activeTab === "tarefas" && <TabTarefas pedido={pedido} />}
        </div>

        {canRespond && !isReadOnly && (
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => window.print()}
                  className="h-7 gap-1 px-2 text-xs text-gray-400"
                >
                  <Printer className="h-3 w-3" /> Imprimir
                </Button>
                {pedido.status === "pendente" && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => {
                      if (window.confirm("Esta ação não pode ser desfeita. Deseja recusar este pedido?")) {
                        recusarMutation.mutate();
                      }
                    }}
                    disabled={recusarMutation.isPending}
                    className="h-7 gap-1 px-2 text-xs text-red-500 hover:bg-red-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Recusar
                  </Button>
                )}
              </div>

              {nextStatus && (
                <Button
                  size="sm"
                  onClick={() => advanceMutation.mutate()}
                  disabled={advanceMutation.isPending}
                  className="h-8 gap-1.5 px-4 text-xs"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {NEXT_LABEL[pedido.status]}
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>

      {previewMedia && (
        <AnexoPreviewModal media={previewMedia} onClose={() => setPreviewMedia(null)} />
      )}
    </>
  );
}
