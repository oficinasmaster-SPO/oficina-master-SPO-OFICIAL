import React from "react";
import { Clock, AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { PEDIDO_STATUS_CONFIG, PRIORIDADE_CONFIG } from "@/components/shared/backlogConstants";

// ── Timer "há X" desde criação ────────────────────────────────────────────
function timeSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}min`;
  if (hours < 24)  return `${hours}h`;
  if (days  < 30)  return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

function isVencido(p) {
  if (!p.prazo) return false;
  if (["concluido", "recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

// ── Avatar iniciais ───────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name
    ? name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const COLORS = [
    "bg-blue-500","bg-violet-500","bg-teal-500","bg-orange-500",
    "bg-pink-500","bg-cyan-500","bg-indigo-500","bg-amber-500",
  ];
  const ci = name ? name.charCodeAt(0) % COLORS.length : 0;
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${COLORS[ci]}`}>
      {initials}
    </span>
  );
}

// ── Ícone de prioridade ────────────────────────────────────────────────────
function PriorityIcon({ prioridade }) {
  if (prioridade === "critica") return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  if (prioridade === "alta")    return <ArrowUp       className="h-3.5 w-3.5 text-orange-500" />;
  if (prioridade === "media")   return <Minus         className="h-3.5 w-3.5 text-yellow-500" />;
  return                               <ArrowDown     className="h-3.5 w-3.5 text-blue-400" />;
}

// ── Badge de status ────────────────────────────────────────────────────────
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
  const cls   = STATUS_PILL[status] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ── Timer chip (à direita, estilo LiveAgent) ───────────────────────────────
function TimerChip({ dateStr, vencido }) {
  const label = timeSince(dateStr);
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums whitespace-nowrap
      ${vencido
        ? "border-red-300 bg-red-100 text-red-700"
        : "border-gray-200 bg-gray-50 text-gray-500"}`}
    >
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ── Linha de ticket ────────────────────────────────────────────────────────
function TicketRow({ pedido, onSelect, isSelected }) {
  const vencido  = isVencido(pedido);
  const criado   = pedido.created_date || pedido.data_criacao;

  return (
    <button
      onClick={() => onSelect(pedido)}
      className={`
        group flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left
        transition-colors hover:bg-blue-50/60
        border-l-2
        ${isSelected  ? "bg-blue-50 border-l-blue-500"
          : vencido   ? "border-l-red-400"
          : "border-l-transparent"}
      `}
    >
      {/* Avatar solicitante */}
      <Avatar name={pedido.requester_name || "?"} />

      {/* Info central */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[10px] text-gray-400">
            #{pedido.id?.slice(-6).toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold text-gray-900">
            {pedido.requester_name || "—"}
          </span>
        </div>
        <p className="truncate text-sm text-gray-600">{pedido.titulo}</p>
        {pedido.workshop_nome && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400">{pedido.workshop_nome}</p>
        )}
      </div>

      {/* Coluna direita: timer + status */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <PriorityIcon prioridade={pedido.prioridade} />
          <TimerChip dateStr={criado} vencido={vencido} />
        </div>
        <StatusPill status={pedido.status} />
      </div>
    </button>
  );
}

// ── Cabeçalho da coluna ────────────────────────────────────────────────────
function ListHeader({ count }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <span className="w-8" />
        <span className="flex-1">Solicitante / Título</span>
        <span>P</span>
        <span className="w-[80px] text-right">Importância / Status</span>
      </div>
    </div>
  );
}

// ── Componente exportado ───────────────────────────────────────────────────
export default function PedidoInternoList({ pedidos, onSelect, isLoading, selectedId }) {
  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-gray-200" />
              <div className="h-3 w-56 rounded bg-gray-100" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-4 w-14 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded-full bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div>
      <ListHeader count={pedidos.length} />
      {pedidos.map((pedido) => (
        <TicketRow
          key={pedido.id}
          pedido={pedido}
          onSelect={onSelect}
          isSelected={pedido.id === selectedId}
        />
      ))}
    </div>
  );
}
