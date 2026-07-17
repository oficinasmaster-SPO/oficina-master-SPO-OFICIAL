/**
 * PedidoInternoList — Lista agrupada estilo Lovable
 * Cada grupo dentro de container com borda arredondada.
 * Rows com divide-y interno, padding generoso, avatares vibrantes.
 */
import React, { useState, useCallback } from "react";
import {
  Clock, AlertTriangle, ArrowUp, ArrowDown, Minus,
  ChevronDown, ChevronRight, Search as SearchIcon,
  ClipboardList, CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import { PEDIDO_STATUS_CONFIG } from "@/components/shared/backlogConstants";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";

/* ═══════════════════════════════════════════════════════════════════════════ */
const STATUS_GROUPS = [
  { key: "em_analise", label: "Em Análise",  dot: "bg-blue-500",    defaultCollapsed: false },
  { key: "pendente",   label: "Pendente",    dot: "bg-amber-500",   defaultCollapsed: false },
  { key: "aprovado",   label: "Aprovado",    dot: "bg-emerald-500", defaultCollapsed: false },
  { key: "recusado",   label: "Recusado",    dot: "bg-red-500",     defaultCollapsed: true },
  { key: "concluido",  label: "Concluído",   dot: "bg-gray-400",    defaultCollapsed: true },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function timeSince(d) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), dy = Math.floor(ms/86400000);
  if (m < 60) return `${m}min`; if (h < 24) return `${h}h`; if (dy < 30) return `${dy}d`;
  return `${Math.floor(dy/30)}m`;
}
function isOverdue(p) {
  if (!p.prazo || ["concluido","recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

/* ── Cores de avatar determinísticas ──────────────────────────────────────── */
const AV_COLORS = [
  "bg-blue-600","bg-violet-600","bg-teal-600","bg-orange-500",
  "bg-pink-600","bg-cyan-600","bg-indigo-600","bg-amber-600",
  "bg-rose-600","bg-emerald-600","bg-fuchsia-600","bg-sky-600",
];
function pickColor(name) { return AV_COLORS[name ? name.charCodeAt(0) % AV_COLORS.length : 0]; }
function initials(name) { return name ? name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?"; }

/* ── Avatar 40px ──────────────────────────────────────────────────────────── */
function Avatar({ name, photoUrl }) {
  const ini = initials(name); const col = pickColor(name);
  if (photoUrl) {
    return (
      <span className="relative h-10 w-10 shrink-0">
        <img src={photoUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm" onError={e=>{e.target.style.display="none";}} />
        <span className={`absolute inset-0 flex items-center justify-center rounded-full text-xs font-bold text-white ${col} -z-10`}>{ini}</span>
      </span>
    );
  }
  return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${col}`}>{ini}</span>;
}

/* ── Mini avatar 22px ──────────────────────────────────────────────────────── */
function MiniAvatar({ name, photoUrl }) {
  const ini = initials(name); const col = pickColor(name);
  if (photoUrl) {
    return (
      <span className="relative h-[22px] w-[22px] shrink-0">
        <img src={photoUrl} alt="" className="h-[22px] w-[22px] rounded-full object-cover ring-1 ring-white" onError={e=>{e.target.style.display="none";}} />
        <span className={`absolute inset-0 flex items-center justify-center rounded-full text-[8px] font-bold text-white ${col} -z-10`}>{ini}</span>
      </span>
    );
  }
  return <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ${col}`}>{ini}</span>;
}

/* ── Priority Icon ────────────────────────────────────────────────────────── */
function PriorityIcon({ p }) {
  if (p === "critica") return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (p === "alta")    return <ArrowUp       className="h-4 w-4 text-orange-500" />;
  if (p === "media")   return <Minus         className="h-4 w-4 text-gray-400" />;
  return                      <ArrowDown     className="h-4 w-4 text-blue-400" />;
}

/* ── Status Pill ──────────────────────────────────────────────────────────── */
const ST = {
  pendente:   { bg:"bg-amber-100  text-amber-800",   icon: Clock },
  em_analise: { bg:"bg-blue-100   text-blue-800",    icon: SearchIcon },
  aprovado:   { bg:"bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  recusado:   { bg:"bg-red-100    text-red-800",     icon: XCircle },
  concluido:  { bg:"bg-gray-100   text-gray-600",    icon: CheckCircle2 },
};
function StatusPill({ status }) {
  const c = ST[status] || ST.pendente; const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold leading-none ${c.bg}`}>
      <Icon className="h-3 w-3" />
      {PEDIDO_STATUS_CONFIG[status]?.label || status}
    </span>
  );
}

/* ── Age Pill ─────────────────────────────────────────────────────────────── */
function AgePill({ date, overdue }) {
  const l = timeSince(date); if (!l) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums
      ${overdue ? "bg-red-50 text-red-600" : "text-gray-500"}`}>
      <Clock className="h-3 w-3" />{l}
    </span>
  );
}

/* ── Client Badge ─────────────────────────────────────────────────────────── */
const CC = [
  "bg-fuchsia-100 text-fuchsia-700", "bg-sky-100 text-sky-700",
  "bg-lime-100 text-lime-700",       "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700",   "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",       "bg-cyan-100 text-cyan-700",
];
function ClientBadge({ name }) {
  if (!name) return <span className="text-xs text-gray-300">—</span>;
  const i = name.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % CC.length;
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium truncate max-w-[200px] ${CC[i]}`}>{name}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP HEADER — dentro do container arredondado
   ═══════════════════════════════════════════════════════════════════════════ */
function GroupHeader({ group, count, collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 px-5 py-3 text-left transition-colors hover:bg-gray-50/50"
    >
      {collapsed
        ? <ChevronRight className="h-4 w-4 text-gray-400" />
        : <ChevronDown  className="h-4 w-4 text-gray-400" />}
      <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} />
      <span className="text-sm font-semibold text-gray-800">{group.label}</span>
      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600 tabular-nums">
        {count}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICKET ROW
   ═══════════════════════════════════════════════════════════════════════════ */
function TicketRow({ pedido, onSelect, isSelected, getName, getPhoto }) {
  const overdue = isOverdue(pedido);
  const done    = ["concluido","recusado"].includes(pedido.status);
  const criado  = pedido.created_date || pedido.data_criacao;

  const rName  = getName(pedido.requester_id, pedido.requester_name);
  const rPhoto = getPhoto(pedido.requester_id);
  const aName  = getName(pedido.assignee_id, pedido.assignee_name);
  const aPhoto = getPhoto(pedido.assignee_id);

  const bar =
    pedido.prioridade === "critica" ? "before:bg-red-500" :
    pedido.prioridade === "alta"    ? "before:bg-orange-400" : "";

  return (
    <button
      onClick={() => onSelect(pedido)}
      className={`
        group relative flex w-full items-center gap-5 px-5 py-4 text-left transition-all
        hover:bg-blue-50/30
        before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r
        ${bar}
        ${isSelected ? "bg-blue-50/50 ring-1 ring-blue-200 ring-inset" : ""}
      `}
    >
      {/* Avatar */}
      <Avatar name={rName} photoUrl={rPhoto} />

      {/* Solicitante */}
      <div className="w-[170px] shrink-0 border-r border-gray-100 pr-4">
        <p className="font-mono text-[10px] text-gray-400 leading-none mb-0.5">#{pedido.id?.slice(-6).toUpperCase()}</p>
        <p className={`text-[13px] font-semibold leading-tight truncate ${done ? "text-gray-400" : "text-gray-900"}`}>
          {rName}
        </p>
      </div>

      {/* Título */}
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 leading-none mb-1">Chamado</p>
        <p className={`text-[14px] font-semibold leading-snug truncate ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {pedido.titulo}
        </p>
      </div>

      {/* Cliente */}
      <div className="w-[200px] shrink-0 border-l border-gray-100 pl-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 leading-none mb-1">Cliente</p>
        <ClientBadge name={pedido.workshop_nome} />
      </div>

      {/* Prioridade */}
      <div className="w-[60px] shrink-0 flex justify-center">
        <PriorityIcon p={pedido.prioridade} />
      </div>

      {/* Status */}
      <div className="w-[120px] shrink-0 flex justify-center">
        <StatusPill status={pedido.status} />
      </div>

      {/* SLA + Responsável */}
      <div className="w-[160px] shrink-0 flex flex-col items-end gap-1.5">
        <AgePill date={criado} overdue={overdue} />
        {aName && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
            <MiniAvatar name={aName} photoUrl={aPhoto} />
            <span className="truncate max-w-[90px]">{aName}</span>
          </span>
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLUMN HEADERS (exported, used by parent as fixed header)
   ═══════════════════════════════════════════════════════════════════════════ */
export function ColumnHeaders() {
  return (
    <div className="flex items-center gap-5 border-t border-gray-200 bg-gray-50/60 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
      <span className="w-10 shrink-0" />
      <span className="w-[170px] shrink-0">Solicitante</span>
      <span className="min-w-0 flex-1">Título do chamado</span>
      <span className="w-[200px] shrink-0 pl-4">Cliente</span>
      <span className="w-[60px] shrink-0 text-center">Prioridade</span>
      <span className="w-[120px] shrink-0 text-center">Status</span>
      <span className="w-[160px] shrink-0 text-right">SLA / Responsável</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */
function SkeletonRows() {
  return (
    <div className="space-y-4 p-4">
      {[0,1].map(g => (
        <div key={g} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50/50 flex items-center gap-3 animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-4 w-6 rounded-full bg-gray-200" />
          </div>
          {[0,1,2].map(r => (
            <div key={r} className="flex items-center gap-5 px-5 py-4 border-t border-gray-100 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="w-[170px] shrink-0 space-y-1.5 pr-4">
                <div className="h-2.5 w-14 rounded bg-gray-200" />
                <div className="h-3.5 w-28 rounded bg-gray-200" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-12 rounded bg-gray-200" />
                <div className="h-4 w-52 rounded bg-gray-100" />
              </div>
              <div className="w-[200px] shrink-0 pl-4"><div className="h-5 w-28 rounded bg-gray-100" /></div>
              <div className="w-[60px] shrink-0 flex justify-center"><div className="h-4 w-4 rounded bg-gray-200" /></div>
              <div className="w-[120px] shrink-0 flex justify-center"><div className="h-6 w-20 rounded-full bg-gray-100" /></div>
              <div className="w-[160px] shrink-0 flex justify-end"><div className="h-4 w-14 rounded bg-gray-100" /></div>
            </div>
          ))}
        </div>
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
        <p className="mt-1 text-xs text-gray-300">Tente ajustar os filtros ou criar um novo pedido</p>
      </div>
    );
  }

  // Agrupar
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
    <div className="space-y-4 p-4">
      {STATUS_GROUPS.map(group => {
        const items = grouped[group.key] || [];
        if (items.length === 0 && !["pendente","em_analise"].includes(group.key)) return null;

        return (
          <div key={group.key} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {/* Group header */}
            <GroupHeader
              group={group}
              count={items.length}
              collapsed={!!collapsed[group.key]}
              onToggle={() => toggle(group.key)}
            />

            {/* Rows */}
            {!collapsed[group.key] && (
              <div className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <div className="px-6 py-5 text-sm text-gray-400 italic">Nenhum pedido neste grupo</div>
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
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
