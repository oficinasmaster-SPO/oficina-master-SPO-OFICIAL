/**
 * PedidoInternoList — Listagem densa estilo Linear/Jira.
 * Colunas: Cliente | Pedido | Solicitante → Responsável | Prioridade | Status | Tempo
 */
import React, { useState, useCallback } from "react";
import {
  Clock, ClipboardList, Eye, MoreHorizontal, ArrowRight,
  ArrowDown, Minus, ArrowUp, AlertOctagon,
} from "lucide-react";
import { PEDIDO_STATUS_CONFIG } from "@/components/shared/backlogConstants";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";

/* ── Grid — colunas compactadas (~15% menos espaço), Pedido respira mais ── */
export const COL = {
  cliente:     "w-[148px] shrink-0",
  pedido:      "flex-1 min-w-[270px]",
  solicitante: "w-[140px] shrink-0",
  responsavel: "w-[140px] shrink-0",
  prioridade:  "w-[90px] shrink-0",
  status:      "w-[112px] shrink-0",
  sla:         "w-[84px] shrink-0",
  gap:         "gap-3",
  px:          "px-4",
};

const MIN_TABLE = "min-w-[1040px]";

/* ── Dividers — header forte, rows quase invisível, desaparecem no hover ── */
const HD = "border-r border-r-slate-900/5";
const RD = "border-r border-r-black/[0.04] group-hover:border-r-transparent transition-colors duration-150";

/* ── Status groups ─────────────────────────────────────────────────────── */
const STATUS_GROUPS = [
  { key: "em_analise", label: "Em Análise",  token: "analysis", defaultCollapsed: false },
  { key: "pendente",   label: "Pendente",    token: "pending",  defaultCollapsed: false },
  { key: "aprovado",   label: "Aprovado",    token: "approved", defaultCollapsed: false },
  { key: "recusado",   label: "Recusado",    token: "rejected", defaultCollapsed: true },
  { key: "concluido",  label: "Concluído",   token: "done",     defaultCollapsed: true },
];

/* ── SLA — 4 níveis ────────────────────────────────────────────────────── */
function slaLevel(d) {
  if (!d) return null;
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  if (h < 24)  return "fresh";
  if (h < 72)  return "warn";
  if (h < 168) return "high";
  return "critical";
}

const SLA_STYLES = {
  fresh:    "bg-[hsl(var(--sla-fresh-bg))] text-[hsl(var(--sla-fresh))]",
  warn:     "bg-[hsl(var(--sla-warn-bg))] text-[hsl(var(--sla-warn))]",
  high:     "bg-[hsl(var(--sla-high-bg))] text-[hsl(var(--sla-high))]",
  critical: "bg-[hsl(var(--sla-critical-bg))] text-[hsl(var(--sla-critical))]",
};

function timeSince(d) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  const totalHours = Math.floor(ms / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(ms / 60000);
  return `${mins}min`;
}

function isOverdue(p) {
  if (!p.prazo || ["concluido","recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

/* ── Avatar 24px ──────────────────────────────────────────────────────── */
const AV_COLORS = [
  "bg-blue-100 text-blue-600","bg-violet-100 text-violet-600",
  "bg-teal-100 text-teal-600","bg-orange-100 text-orange-600",
  "bg-pink-100 text-pink-600","bg-cyan-100 text-cyan-600",
  "bg-indigo-100 text-indigo-600","bg-amber-100 text-amber-600",
];
function pickColor(n) { return AV_COLORS[n ? n.charCodeAt(0) % AV_COLORS.length : 0]; }
function initials(n) { return n ? n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?"; }

function MiniAvatar({ name, photoUrl }) {
  const i = initials(name), c = pickColor(name);
  if (photoUrl) {
    return (
      <span className="relative h-6 w-6 shrink-0">
        <img src={photoUrl} alt="" className="h-6 w-6 rounded-full object-cover" onError={e=>{e.target.style.display="none";}} />
        <span className={`absolute inset-0 flex items-center justify-center rounded-full text-[9px] font-semibold ${c} -z-10`}>{i}</span>
      </span>
    );
  }
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${c}`}>{i}</span>;
}

/* ── Prioridade (ícone + label, sem fundo) ─────────────────────────────── */
const PRIO = {
  baixa:   { label: "Baixa",   icon: ArrowDown,    cls: "text-gray-400" },
  media:   { label: "Média",   icon: Minus,         cls: "text-gray-500" },
  alta:    { label: "Alta",    icon: ArrowUp,       cls: "text-orange-500" },
  critica: { label: "Crítica", icon: AlertOctagon,  cls: "text-red-500" },
};
function PriorityLabel({ prioridade }) {
  const cfg = PRIO[prioridade?.toLowerCase()] || PRIO.baixa;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

/* ── Status (dot 6px + label, fundo suave via tokens) ──────────────────── */
const STATUS_BADGE_STYLES = {
  em_analise: "bg-[hsl(var(--status-analysis-bg))] text-[hsl(var(--status-analysis))]",
  pendente:   "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending))]",
  aprovado:   "bg-[hsl(var(--status-approved-bg))] text-[hsl(var(--status-approved))]",
  recusado:   "bg-[hsl(var(--status-rejected-bg))] text-[hsl(var(--status-rejected))]",
  concluido:  "bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done))]",
};

const STATUS_DOT_STYLES = {
  em_analise: "bg-[hsl(var(--status-analysis))]",
  pendente:   "bg-[hsl(var(--status-pending))]",
  aprovado:   "bg-[hsl(var(--status-approved))]",
  recusado:   "bg-[hsl(var(--status-rejected))]",
  concluido:  "bg-[hsl(var(--status-done))]",
};

const STATUS_BG_STYLES = {
  em_analise: "bg-blue-50 hover:bg-blue-100",
  pendente:   "bg-amber-50 hover:bg-amber-100",
  aprovado:   "bg-emerald-50 hover:bg-emerald-100",
  recusado:   "bg-red-50 hover:bg-red-100",
  concluido:  "bg-gray-50 hover:bg-gray-100",
};

function StatusBadgeLocal({ status }) {
  const label = PEDIDO_STATUS_CONFIG[status]?.label || status;
  const badgeCls = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.concluido;
  const dotCls = STATUS_DOT_STYLES[status] || STATUS_DOT_STYLES.concluido;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeCls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLUMN HEADERS — 36px, sticky, divisores verticais, tracking largo
   ═══════════════════════════════════════════════════════════════════════════ */
export function ColumnHeaders() {
  return (
    <div className={`flex items-center ${COL.gap} ${COL.px} ${MIN_TABLE} h-9 sticky top-0 z-[5] bg-[hsl(var(--surface))] border-b border-[hsl(var(--border-subtle))] text-[11px] font-semibold uppercase tracking-[.08em] text-gray-500 select-none`}>
      <span className={`${COL.cliente} ${HD}`}>Cliente</span>
      <span className={`${COL.pedido} ${HD}`}>Pedido</span>
      <span className={`${COL.solicitante} ${HD}`}>Solicitante</span>
      <span className={`${COL.responsavel} ${HD}`}>Responsável</span>
      <span className={`${COL.prioridade} text-center ${HD}`}>Prioridade</span>
      <span className={`${COL.status} text-center ${HD}`}>Status</span>
      <span className={`${COL.sla} text-right`}>Tempo</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP HEADER — Elegante: ──── 🔵 Em análise · 3 pedidos ────
   ═══════════════════════════════════════════════════════════════════════════ */
function GroupHeader({ group, count, collapsed, onToggle }) {
  const dotCls = STATUS_DOT_STYLES[group.key] || STATUS_DOT_STYLES.concluido;
  const bgCls = STATUS_BG_STYLES[group.key] || "bg-gray-50 hover:bg-gray-100";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      className={`flex items-center ${MIN_TABLE} py-2.5 px-4 cursor-pointer select-none transition-all duration-150 ${bgCls} ${collapsed ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className={`h-[7px] w-[7px] rounded-full ${dotCls}`} />
        <span className="text-[12px] font-semibold text-gray-600 tracking-wide">{group.label}</span>
        <span className="text-[11px] text-gray-400 font-medium tabular-nums">
          · {count} {count === 1 ? "pedido" : "pedidos"}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICKET ROW — 54px, hover forte, divisores, ações no hover
   ═══════════════════════════════════════════════════════════════════════════ */
function TicketRow({ pedido, onSelect, isSelected, getName, getPhoto }) {
  const done   = ["concluido","recusado"].includes(pedido.status);
  const criado = pedido.created_date || pedido.data_criacao;
  const level  = slaLevel(criado);

  const rName  = getName(pedido.requester_id, pedido.requester_name);
  const rPhoto = getPhoto(pedido.requester_id);
  const aName  = getName(pedido.assignee_id, pedido.assignee_name);
  const aPhoto = getPhoto(pedido.assignee_id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(pedido)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(pedido); } }}
      className={`
        group relative flex w-full items-center ${COL.gap} ${COL.px} ${MIN_TABLE}
        h-[54px] text-left cursor-pointer select-none
        transition-all duration-150
        border-b border-[hsl(var(--border-subtle))]
        before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-r before:transition-colors before:duration-150
        ${isSelected
          ? "bg-[hsl(var(--row-selected))] before:bg-blue-500"
          : "before:bg-transparent hover:bg-blue-50/60 hover:before:bg-blue-400"}
      `}
    >
      {/* Cliente */}
      <div className={`${COL.cliente} ${RD} truncate text-[13px] text-gray-700`}>
        {pedido.workshop_nome || "—"}
      </div>

      {/* Pedido (título mais forte + ID) */}
      <div className={`${COL.pedido} ${RD} min-w-0`}>
        <p className={`text-[14px] font-semibold tracking-tight truncate ${done ? "text-gray-400" : "text-gray-900"}`}>
          {pedido.titulo}
        </p>
        <p className="text-[11px] text-gray-400 tabular-nums leading-none mt-0.5">
          #{pedido.id?.slice(-6).toUpperCase()}
        </p>
      </div>

      {/* Solicitante */}
      <div className={`${COL.solicitante} ${RD} flex items-center gap-2 min-w-0`}>
        <MiniAvatar name={rName} photoUrl={rPhoto} />
        <span className={`text-[13px] truncate ${done ? "text-gray-400" : "text-gray-700"}`}>
          {rName}
        </span>
      </div>

      {/* Responsável (com seta → de ligação) */}
      <div className={`${COL.responsavel} ${RD} flex items-center gap-1.5 min-w-0`}>
        <ArrowRight className="h-4 w-4 text-red-600 shrink-0" />
        {aName ? (
          <>
            <MiniAvatar name={aName} photoUrl={aPhoto} />
            <span className={`text-[13px] truncate ${done ? "text-gray-400" : "text-gray-700"}`}>
              {aName}
            </span>
          </>
        ) : (
          <span className="text-[12px] text-gray-300 italic">Não atribuído</span>
        )}
      </div>

      {/* Prioridade */}
      <div className={`${COL.prioridade} ${RD} flex justify-center`}>
        <PriorityLabel prioridade={pedido.prioridade} />
      </div>

      {/* Status */}
      <div className={`${COL.status} ${RD} flex justify-center`}>
        <StatusBadgeLocal status={pedido.status} />
      </div>

      {/* Tempo Aberto — SLA badge alinhado à direita */}
      <div className={`${COL.sla} flex justify-end`}>
        {level ? (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${SLA_STYLES[level]}`}>
            <Clock className="h-3 w-3" />
            {timeSince(criado)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-300">{"—"}</span>
        )}
      </div>

      {/* Ações — visíveis apenas no hover */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-blue-50 rounded-md px-1 py-0.5 shadow-sm">
        <button
          onClick={e => { e.stopPropagation(); onSelect(pedido); }}
          className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Visualizar"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); }}
          className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Mais ações"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */
function SkeletonRows() {
  return (
    <div>
      {[0,1].map(g => (
        <React.Fragment key={g}>
          <div className={`flex items-center ${MIN_TABLE} py-3 px-4 animate-pulse`}>
            <div className="h-px flex-1 bg-gray-100" />
            <div className="flex items-center gap-2 px-4">
              <div className="h-2 w-2 rounded-full bg-gray-200" />
              <div className="h-3.5 w-24 rounded bg-gray-200" />
            </div>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          {[0,1,2].map(r => (
            <div key={r} className={`flex items-center ${COL.gap} ${COL.px} h-[54px] border-b border-[hsl(var(--border-subtle))] animate-pulse`}>
              <div className={COL.cliente}><div className="h-4 w-28 rounded bg-gray-100" /></div>
              <div className={COL.pedido}>
                <div className="h-4 w-40 rounded bg-gray-100 mb-1" />
                <div className="h-3 w-16 rounded bg-gray-50" />
              </div>
              <div className={`${COL.solicitante} flex items-center gap-2`}>
                <div className="h-6 w-6 rounded-full bg-gray-200" />
                <div className="h-3.5 w-20 rounded bg-gray-100" />
              </div>
              <div className={`${COL.responsavel} flex items-center gap-2`}>
                <div className="h-6 w-6 rounded-full bg-gray-200" />
                <div className="h-3.5 w-20 rounded bg-gray-100" />
              </div>
              <div className={`${COL.prioridade} flex justify-center`}><div className="h-4 w-14 rounded bg-gray-100" /></div>
              <div className={`${COL.status} flex justify-center`}><div className="h-5 w-20 rounded-full bg-gray-100" /></div>
              <div className={`${COL.sla} flex justify-end`}><div className="h-5 w-16 rounded-md bg-gray-100" /></div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PedidoInternoList({ pedidos, onSelect, isLoading, selectedId }) {
  const { getName, getPhoto } = useEmployeeResolver();

  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    STATUS_GROUPS.forEach(g => { if (g.defaultCollapsed) init[g.key] = true; });
    return init;
  });
  const toggle = useCallback((k) => setCollapsed(p => ({ ...p, [k]: !p[k] })), []);

  if (isLoading) return <SkeletonRows />;

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ClipboardList className="mb-3 h-12 w-12 text-gray-200" />
        <p className="text-sm font-medium text-gray-400">Nenhum pedido encontrado</p>
        <p className="mt-1 text-xs text-gray-300">Ajuste os filtros ou crie um novo pedido</p>
      </div>
    );
  }

  const grouped = {};
  STATUS_GROUPS.forEach(g => { grouped[g.key] = []; });
  pedidos.forEach(p => { if (grouped[p.status]) grouped[p.status].push(p); });
  Object.keys(grouped).forEach(k => {
    grouped[k].sort((a,b) => {
      const vA = isOverdue(a)?0:1, vB = isOverdue(b)?0:1;
      if (vA !== vB) return vA - vB;
      return new Date(b.created_date||0) - new Date(a.created_date||0);
    });
  });

  return (
    <div>
      {STATUS_GROUPS.map(group => {
        const items = grouped[group.key] || [];
        if (items.length === 0 && !["pendente","em_analise"].includes(group.key)) return null;

        return (
          <div key={group.key}>
            <GroupHeader
              group={group}
              count={items.length}
              collapsed={!!collapsed[group.key]}
              onToggle={() => toggle(group.key)}
            />
            {!collapsed[group.key] && (
              items.length === 0 ? (
                <div className={`${COL.px} py-5 text-sm text-gray-400 italic border-b border-[hsl(var(--border-subtle))]`}>Nenhum pedido</div>
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