/**
 * PedidoInternoList — Lista agrupada de pedidos internos
 *
 * Segue spec REFACTOR_BRIEF.md:
 * - Linhas densas estilo LiveAgent com espaçamento controlado
 * - Grid: Avatar | Solicitante | Título | Cliente | Prioridade | Status | SLA+Resp
 * - Agrupamento colapsável por status com contador
 * - Barra de prioridade à esquerda (vermelho = urgente/alta)
 * - useEmployeeResolver para nomes reais + fotos de perfil
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  Clock, AlertTriangle, ArrowUp, ArrowDown, Minus,
  ChevronDown, ChevronRight, Search as SearchIcon,
  ClipboardList, CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import { PEDIDO_STATUS_CONFIG } from "@/components/shared/backlogConstants";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS GROUPS
   ═══════════════════════════════════════════════════════════════════════════ */
const STATUS_GROUPS = [
  { key: "em_analise", label: "Em Análise",  dot: "bg-blue-500",   headerBg: "bg-blue-50/70",  border: "border-blue-200" },
  { key: "pendente",   label: "Pendente",    dot: "bg-amber-500",  headerBg: "bg-amber-50/70", border: "border-amber-200" },
  { key: "aprovado",   label: "Aprovado",    dot: "bg-emerald-500", headerBg: "bg-emerald-50/70", border: "border-emerald-200" },
  { key: "recusado",   label: "Recusado",    dot: "bg-red-500",    headerBg: "bg-red-50/70",   border: "border-red-200", defaultCollapsed: true },
  { key: "concluido",  label: "Concluído",   dot: "bg-gray-400",   headerBg: "bg-gray-50/70",  border: "border-gray-200", defaultCollapsed: true },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function timeSince(dateStr) {
  if (!dateStr) return null;
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}min`;
  if (hours < 24) return `${hours}h`;
  if (days  < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

function isOverdue(p) {
  if (!p.prazo) return false;
  if (["concluido", "recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

/* ── Avatar com foto (36px) ────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-blue-600","bg-violet-600","bg-teal-600","bg-orange-600",
  "bg-pink-600","bg-cyan-600","bg-indigo-600","bg-amber-600",
];

function Avatar36({ name, photoUrl }) {
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const ci = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;

  if (photoUrl) {
    return (
      <span className="relative h-9 w-9 shrink-0">
        <img
          src={photoUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <span className={`absolute inset-0 flex items-center justify-center rounded-full text-[11px] font-bold text-white ${AVATAR_COLORS[ci]} -z-10`}>
          {initials}
        </span>
      </span>
    );
  }

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm ${AVATAR_COLORS[ci]}`}>
      {initials}
    </span>
  );
}

/* ── Mini avatar (20px) para responsável ───────────────────────────────── */
function MiniAvatar({ name, photoUrl }) {
  const initials = name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const ci = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;

  if (photoUrl) {
    return (
      <span className="relative h-5 w-5 shrink-0">
        <img src={photoUrl} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white" onError={(e) => { e.target.style.display = "none"; }} />
        <span className={`absolute inset-0 flex items-center justify-center rounded-full text-[7px] font-bold text-white ${AVATAR_COLORS[ci]} -z-10`}>{initials}</span>
      </span>
    );
  }
  return <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-white ${AVATAR_COLORS[ci]}`}>{initials}</span>;
}

/* ── Priority icon ─────────────────────────────────────────────────────── */
function PriorityIcon({ prioridade }) {
  if (prioridade === "critica") return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (prioridade === "alta")    return <ArrowUp       className="h-4 w-4 text-orange-500" />;
  if (prioridade === "media")   return <Minus         className="h-4 w-4 text-gray-400" />;
  return                               <ArrowDown     className="h-4 w-4 text-blue-400" />;
}

/* ── Status Pill (ícone + label + cor semântica) ───────────────────────── */
const STATUS_STYLES = {
  pendente:   { bg: "bg-amber-100",   text: "text-amber-800",   icon: Clock },
  em_analise: { bg: "bg-blue-100",    text: "text-blue-800",    icon: SearchIcon },
  aprovado:   { bg: "bg-emerald-100", text: "text-emerald-800", icon: CheckCircle2 },
  recusado:   { bg: "bg-red-100",     text: "text-red-800",     icon: XCircle },
  concluido:  { bg: "bg-gray-100",    text: "text-gray-600",    icon: CheckCircle2 },
};

function StatusPill({ status }) {
  const cfg   = STATUS_STYLES[status] || STATUS_STYLES.pendente;
  const label = PEDIDO_STATUS_CONFIG[status]?.label || status;
  const Icon  = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/* ── Age Pill (SLA timer) ──────────────────────────────────────────────── */
function AgePill({ dateStr, overdue }) {
  const label = timeSince(dateStr);
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums
      ${overdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

/* ── Client badge (cor determinística por hash) ────────────────────────── */
const CLIENT_COLORS = [
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-sky-100 text-sky-700",
  "bg-lime-100 text-lime-700",
  "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
];

function ClientBadge({ name }) {
  if (!name) return <span className="text-xs text-gray-300">—</span>;
  const ci = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % CLIENT_COLORS.length;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold leading-none truncate max-w-[180px] ${CLIENT_COLORS[ci]}`}>
      {name}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP HEADER
   ═══════════════════════════════════════════════════════════════════════════ */
function GroupHeader({ group, count, collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${group.headerBg} border-y ${group.border}`}
    >
      {collapsed
        ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        : <ChevronDown  className="h-3.5 w-3.5 text-gray-400" />}
      <span className={`h-2 w-2 rounded-full ${group.dot}`} />
      <span className="text-xs font-semibold text-gray-700">{group.label}</span>
      <span className="rounded-full bg-gray-900/8 px-2 py-0.5 text-[10px] font-bold text-gray-600">
        {count}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICKET ROW — grid-cols-[auto_180px_1fr_200px_80px_112px_176px]
   ═══════════════════════════════════════════════════════════════════════════ */
function TicketRow({ pedido, onSelect, isSelected, getName, getPhoto }) {
  const overdue = isOverdue(pedido);
  const done    = ["concluido", "recusado"].includes(pedido.status);
  const criado  = pedido.created_date || pedido.data_criacao;

  const requesterName  = getName(pedido.requester_id, pedido.requester_name);
  const requesterPhoto = getPhoto(pedido.requester_id);
  const assigneeName   = getName(pedido.assignee_id, pedido.assignee_name);
  const assigneePhoto  = getPhoto(pedido.assignee_id);

  // Barra de prioridade à esquerda
  const priorityBar =
    pedido.prioridade === "critica" ? "before:bg-red-500" :
    pedido.prioridade === "alta"    ? "before:bg-orange-400" : "";

  return (
    <button
      onClick={() => onSelect(pedido)}
      className={`
        group relative flex w-full items-center gap-4 border-b border-gray-100
        px-4 py-3 text-left transition-colors
        hover:bg-blue-50/40
        before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-r
        ${priorityBar}
        ${isSelected ? "bg-blue-50/60" : ""}
      `}
    >
      {/* Col 1 — Avatar solicitante (auto) */}
      <Avatar36 name={requesterName} photoUrl={requesterPhoto} />

      {/* Col 2 — Solicitante (180px, border-r) */}
      <div className="w-[160px] shrink-0 border-r border-gray-100 pr-3">
        <p className="font-mono text-[10px] text-gray-400">#{pedido.id?.slice(-6).toUpperCase()}</p>
        <p className={`truncate text-[13px] font-semibold leading-tight ${done ? "text-gray-400" : "text-gray-900"}`}>
          {requesterName}
        </p>
      </div>

      {/* Col 3 — Título (1fr, área livre protagonista) */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Chamado</p>
        <p className={`truncate text-[14px] font-semibold leading-snug ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {pedido.titulo}
        </p>
      </div>

      {/* Col 4 — Cliente (200px, border-l) */}
      <div className="w-[180px] shrink-0 border-l border-gray-100 pl-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">Cliente</p>
        <ClientBadge name={pedido.workshop_nome} />
      </div>

      {/* Col 5 — Prioridade (80px) */}
      <div className="w-[56px] shrink-0 flex justify-center">
        <PriorityIcon prioridade={pedido.prioridade} />
      </div>

      {/* Col 6 — Status (112px) */}
      <div className="w-[112px] shrink-0 flex justify-center">
        <StatusPill status={pedido.status} />
      </div>

      {/* Col 7 — SLA + Responsável (176px, right-aligned) */}
      <div className="w-[150px] shrink-0 flex flex-col items-end gap-1">
        <AgePill dateStr={criado} overdue={overdue} />
        {assigneeName && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
            <MiniAvatar name={assigneeName} photoUrl={assigneePhoto} />
            <span className="truncate max-w-[90px]">{assigneeName}</span>
          </span>
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLUMN HEADERS (fixo, dentro do bloco fixo do parent)
   ═══════════════════════════════════════════════════════════════════════════ */
export function ColumnHeaders() {
  return (
    <div className="flex items-center gap-4 border-t border-gray-200 bg-gray-50/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
      <span className="w-9 shrink-0" />
      <span className="w-[160px] shrink-0 pr-3">Solicitante</span>
      <span className="min-w-0 flex-1">Título do chamado</span>
      <span className="w-[180px] shrink-0 pl-3">Cliente</span>
      <span className="w-[56px] shrink-0 text-center">P</span>
      <span className="w-[112px] shrink-0 text-center">Status</span>
      <span className="w-[150px] shrink-0 text-right">SLA / Responsável</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */
function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
          <div className="h-9 w-9 rounded-full bg-gray-200" />
          <div className="w-[160px] shrink-0 space-y-1.5 pr-3">
            <div className="h-2.5 w-12 rounded bg-gray-200" />
            <div className="h-3.5 w-28 rounded bg-gray-200" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-10 rounded bg-gray-200" />
            <div className="h-4 w-48 rounded bg-gray-100" />
          </div>
          <div className="w-[180px] shrink-0 pl-3"><div className="h-5 w-24 rounded bg-gray-100" /></div>
          <div className="w-[56px] shrink-0"><div className="mx-auto h-4 w-4 rounded bg-gray-200" /></div>
          <div className="w-[112px] shrink-0"><div className="mx-auto h-5 w-20 rounded-full bg-gray-100" /></div>
          <div className="w-[150px] shrink-0 flex justify-end"><div className="h-4 w-16 rounded bg-gray-100" /></div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PedidoInternoList({ pedidos, onSelect, isLoading, selectedId }) {
  const { getName, getPhoto } = useEmployeeResolver();

  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    STATUS_GROUPS.forEach(g => { if (g.defaultCollapsed) init[g.key] = true; });
    return init;
  });

  const toggleGroup = useCallback(
    (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] })),
    []
  );

  if (isLoading) return <SkeletonRows />;

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ClipboardList className="mb-3 h-12 w-12 text-gray-200" />
        <p className="text-sm font-medium text-gray-400">Nenhum pedido encontrado</p>
        <p className="mt-1 text-xs text-gray-300">Tente ajustar os filtros ou criar um novo pedido</p>
      </div>
    );
  }

  // Agrupar por status
  const grouped = {};
  STATUS_GROUPS.forEach(g => { grouped[g.key] = []; });
  pedidos.forEach(p => { if (grouped[p.status]) grouped[p.status].push(p); });

  // Ordenar: overdue primeiro, depois por data de criação (mais recente)
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const vA = isOverdue(a) ? 0 : 1;
      const vB = isOverdue(b) ? 0 : 1;
      if (vA !== vB) return vA - vB;
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });
  });

  return (
    <div>
      {STATUS_GROUPS.map(group => {
        const items = grouped[group.key] || [];
        if (items.length === 0 && !["pendente", "em_analise"].includes(group.key)) return null;

        return (
          <div key={group.key}>
            <GroupHeader
              group={group}
              count={items.length}
              collapsed={!!collapsed[group.key]}
              onToggle={() => toggleGroup(group.key)}
            />
            {!collapsed[group.key] && (
              items.length === 0 ? (
                <div className="px-6 py-4 text-xs text-gray-400 italic">Nenhum pedido neste grupo</div>
              ) : (
                items.map(pedido => (
                  <TicketRow
                    key={pedido.id}
                    pedido={pedido}
                    onSelect={onSelect}
                    isSelected={pedido.id === selectedId}
                    getName={getName}
                    getPhoto={getPhoto}
                  />
                ))
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
