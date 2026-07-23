import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X, Edit2, Trash2, Printer, XCircle, CheckCircle,
  MessageSquare, StickyNote, ListChecks, FileText,
  AlertTriangle, ArrowUp, Minus, ArrowDown,
  Clock, CalendarClock, ChevronLeft, ChevronRight,
  Hash, Flag, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ActivityTimeline from "./ActivityTimeline";
import PedidoInternoStepper from "./PedidoInternoStepper";
import {
  PEDIDO_STATUS_CONFIG, PRIORIDADE_CONFIG,
  TIPO_PEDIDO_LABELS, IMPACTO_CLIENTE_LABELS,
} from "@/components/shared/backlogConstants";
import StatusBadge from "@/components/shared/StatusBadge";

// ── Helpers visuais ────────────────────────────────────────────────────────
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

function PriorityIcon({ prioridade, className = "" }) {
  if (prioridade === "critica") return <AlertTriangle className={`text-red-500 ${className}`} />;
  if (prioridade === "alta")    return <ArrowUp       className={`text-orange-500 ${className}`} />;
  if (prioridade === "media")   return <Minus         className={`text-yellow-500 ${className}`} />;
  return                               <ArrowDown     className={`text-blue-400 ${className}`} />;
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

// ── Aba ────────────────────────────────────────────────────────────────────
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

// ── Campo de detalhe ────────────────────────────────────────────────────────
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

// ── Aba Detalhes ────────────────────────────────────────────────────────────
function TabDetalhes({ pedido }) {
  const prazoFmt = pedido.prazo
    ? format(new Date(pedido.prazo), "dd/MM/yyyy", { locale: ptBR })
    : null;
  const isVencido = pedido.prazo
    && !["concluido","recusado"].includes(pedido.status)
    && new Date(pedido.prazo) < new Date();

  return (
    <div className="space-y-5 px-5 py-4">
      {/* Descrição */}
      {pedido.descricao && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Descrição</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{pedido.descricao}</p>
        </div>
      )}

      {/* Resposta oficial */}
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

      {/* Grid de campos */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <DetailField label="Cliente" icon={Building2}>
          {pedido.workshop_nome || "—"}
        </DetailField>
        <DetailField label="Categoria" icon={FileText}>
          {TIPO_PEDIDO_LABELS[pedido.tipo] || pedido.tipo || "—"}
        </DetailField>
        <DetailField label="Prioridade" icon={Flag}>
          <span className="flex items-center gap-1.5">
            <PriorityIcon prioridade={pedido.prioridade} className="h-3.5 w-3.5" />
            {PRIORIDADE_CONFIG[pedido.prioridade]?.label || "—"}
          </span>
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
    </div>
  );
}

// ── Aba Tarefas ─────────────────────────────────────────────────────────────
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

// ── Componente principal: Drawer ────────────────────────────────────────────
export default function PedidoInternoDrawer({
  pedido,
  user,
  totalPedidos = 0,
  currentIndex = 0,
  onNavigate,   // (direction: "prev"|"next") => void
  onClose,
  onEdit,
  onDelete,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("atividade");
  const queryClient               = useQueryClient();

  // Contar tarefas para badge
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

  // Fechar com Escape, navegar com setas
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
  const canDelete   = user?.role === "admin" || isInternal;
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

  const deleteMutation = useMutation({
    mutationFn: async () => base44.entities.PedidoInterno.delete(pedido.id),
    onSuccess: () => {
      toast.success("Pedido excluído.");
      queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
      onDelete?.();
    },
    onError: () => toast.error("Erro ao excluir"),
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
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[700px] flex-col bg-white shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-right duration-200">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-gray-200">

          {/* Linha 1: nav + código + status + ações */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            {/* Navegação prev/next */}
            {onNavigate && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onNavigate("prev")}
                  disabled={currentIndex === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  title="Pedido anterior (↑)"
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
                  title="Próximo pedido (↓)"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Código monospace */}
            <span className="font-mono text-[11px] text-gray-400 shrink-0">
              #{pedido.id?.slice(-8).toUpperCase()}
            </span>

            <StatusPill status={pedido.status} />

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
              {canDelete && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { if (window.confirm("Tem certeza que deseja excluir este pedido?")) deleteMutation.mutate(); }}
                  disabled={deleteMutation.isPending}
                  className="h-7 gap-1 px-2 text-xs text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
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

          {/* Linha 2: Título */}
          <div className="px-4 pb-2">
            <h2 className={`text-base font-bold leading-snug text-gray-950 ${
              isReadOnly ? "text-gray-400" : ""
            }`}>
              {pedido.titulo}
            </h2>
          </div>

          {/* Linha 3: Meta-row — pessoas + SLA + prazo */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 text-xs">
            {/* Solicitante */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">De</span>
              <Avatar name={pedido.requester_name} size="sm" />
              <span className="font-medium text-gray-700">{pedido.requester_name || "—"}</span>
            </div>

            <span className="h-3 w-px bg-gray-200" />

            {/* Responsável */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Para</span>
              <Avatar name={pedido.assignee_name} size="sm" />
              <span className="font-medium text-gray-700">{pedido.assignee_name || "—"}</span>
            </div>

            <span className="h-3 w-px bg-gray-200" />

            {/* Prioridade */}
            <div className="flex items-center gap-1">
              <PriorityIcon prioridade={pedido.prioridade} className="h-3.5 w-3.5" />
              <span className="text-gray-600">{PRIORIDADE_CONFIG[pedido.prioridade]?.label}</span>
            </div>

            {/* SLA */}
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

            {/* Data */}
            <div className="ml-auto flex items-center gap-1 text-gray-400">
              <CalendarClock className="h-3 w-3" />
              <span className="text-[10px]">{criadoFmt}</span>
            </div>
          </div>

          {/* Linha 4: Stepper clicável */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <PedidoInternoStepper pedido={pedido} canEdit={canEdit && !isReadOnly} />
          </div>

          {/* Linha 5: Abas */}
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

        {/* ── CONTEÚDO DAS ABAS ─────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {/* ATIVIDADE */}
          {activeTab === "atividade" && (
            <div className="flex flex-col gap-4 px-5 py-4">
              {/* Timeline */}
              <ActivityTimeline
                entityType="pedido_interno"
                entityId={pedido.id}
                workshopId={pedido.workshop_id}
                maxHeight="100%"
              />
            </div>
          )}

          {/* DETALHES */}
          {activeTab === "detalhes" && <TabDetalhes pedido={pedido} />}

          {/* TAREFAS */}
          {activeTab === "tarefas" && <TabTarefas pedido={pedido} />}
        </div>

        {/* ── FOOTER DE AÇÕES ───────────────────────────────────────────── */}
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
                {/* Recusar: ação destrutiva discreta */}
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja recusar este pedido?")) {
                      recusarMutation.mutate();
                    }
                  }}
                  disabled={recusarMutation.isPending}
                  className="h-7 gap-1 px-2 text-xs text-red-500 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Recusar
                </Button>
              </div>

              <p className="text-[10px] text-gray-400">
                Use o stepper acima para avançar o status
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}