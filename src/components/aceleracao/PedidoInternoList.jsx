/**
 * PedidoInternoList — Lista agrupada, flush com column headers.
 * Colunas: Cliente | Solicitante | Responsável | Prioridade | Status | Tempo Aberto
 */
import React, { useState, useCallback } from "react";
import {
  Clock, ChevronDown, ChevronRight, Search as SearchIcon,
  ClipboardList, CheckCircle2, XCircle,
} from "lucide-react";
import { PEDIDO_STATUS_CONFIG } from "@/components/shared/backlogConstants";
import PriorityBadge from "@/components/shared/PriorityBadge";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";

export const COL = {
  cliente: "w-[170px] shrink-0",
  solicitante: "w-[160px] shrink-0",
  responsavel: "w-[160px] shrink-0",
  prioridade: "w-[110px] shrink-0",
  status: "w-[120px] shrink-0",
  sla: "w-[100px] shrink-0",
  gap: "gap-4",
  px: "px-5",
};

const STATUS_GROUPS = [
  { key: "em_analise", label: "Em Análise",  dot: "bg-blue-500",    defaultCollapsed: false },
  { key: "pendente",   label: "Pendente",    dot: "bg-amber-500",   defaultCollapsed: false },
  { key: "aprovado",   label: "Aprovado",    dot: "bg-emerald-500", defaultCollapsed: false },
  { key: "recusado",   label: "Recusado",    dot: "bg-red-500",     defaultCollapsed: true },
  { key: "concluido",  label: "Concluído",   dot: "bg-gray-400",    defaultCollapsed: true },
];

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

function slaColor(d) {
  if (!d) return "text-gray-400";
  const ms = Date.now() - new Date(d).getTime();
  const h = ms / 3600000;
  if (h >= 48) return "text-red-600 font-bold";
  if (h >= 24) return "text-orange-500 font-semibold";
  return "text-gray-500";
}

function isOverdue(p) {
  if (!p.prazo || ["concluido","recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

const AV = [
  "bg-blue-600","bg-violet-600","bg-teal-600","bg-orange-500",
  "bg-pink-600","bg-cyan-600","bg-indigo-600","bg-amber-600",
  "bg-rose-600","bg-emerald-600","bg-fuchsia-600","bg-sky-600",
];
function pick(n) { return AV[n ? n.charCodeAt(0) % AV.length : 0]; }
function ini(n) { return n ? n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?"; }

function MiniAvatar({ name, photoUrl }) {
  const i = ini(name), c = pick(name);
  if (photoUrl) {
    return (
      <span className="relative h-[22px] w-[22px] shrink-0">
        <img src={photoUrl} alt="" className="h-[22px] w-[22px] rounded-full object-cover ring-1 ring-white" onError={e=>{e.target.style.display="none";}} />
        <span className={`absolute inset-0 flex items-center justify-center rounded-full text-[8px] font-bold text-white ${c} -z-10`}>{i}</span>
      </span>
    );
  }
  return <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ${c}`}>{i}</span>;
}

const ST = {
  pendente:   { bg:"bg-amber-100 text-amber-800",    icon: Clock },
  em_analise: { bg:"bg-blue-100 text-blue-800",      icon: SearchIcon },
  aprovado:   { bg:"bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  recusado:   { bg:"bg-red-100 text-red-800",        icon: XCircle },
  concluido:  { bg:"bg-gray-100 text-gray-600",      icon: CheckCircle2 },
};
function StatusPill({ status }) {
  const c = ST[status] || ST.pendente; const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold leading-none ${c.bg}`}>
      <Icon className="h-3 w-3" />{PEDIDO_STATUS_CONFIG[status]?.label || status}
    </span>
  );
}

const CC = [
  "bg-fuchsia-100 text-fuchsia-700","bg-sky-100 text-sky-700",
  "bg-lime-100 text-lime-700","bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700","bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700","bg-cyan-100 text-cyan-700",
];
function ClientBadge({ name }) {
  if (!name) return <span className="text-xs text-gray-300">—</span>;
  const i = name.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % CC.length;
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium truncate max-w-[150px] ${CC[i]}`}>{name}</span>;
}

export function ColumnHeaders() {
  return (
    <div className={`flex items-center ${COL.gap} ${COL.px} border-t border-gray-200 bg-gray-50/80 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400`}>
      <span className={COL.cliente}>Cliente</span>
      <span className={COL.solicitante}>Solicitante</span>
      <span className={COL.responsavel}>Responsável</span>
      <span className={`${COL.prioridade} text-center`}>Prioridade</span>
      <span className={`${COL.status} text-center`}>Status</span>
      <span className={`${COL.sla} text-right`}>Tempo Aberto</span>
    </div>
  );
}

function GroupHeader({ group, count, collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="sticky top-0 z-10 flex w-full items-center gap-2.5 border-y border-gray-200 bg-white/95 backdrop-blur-sm px-5 py-3 text-left transition-colors hover:bg-gray-50/60"
    >
      {collapsed
        ? <ChevronRight className="h-4 w-4 text-gray-400" />
        : <ChevronDown  className="h-4 w-4 text-gray-400" />}
      <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} />
      <span className="text-sm font-semibold text-gray-800">{group.label}</span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600 tabular-nums">{count}</span>
    </button>
  );
}

function TicketRow({ pedido, onSelect, isSelected, getName, getPhoto }) {
  const done   = ["concluido","recusado"].includes(pedido.status);
  const criado = pedido.created_date || pedido.data_criacao;
  const rName  = getName(pedido.requester_id, pedido.requester_name);
  const rPhoto = getPhoto(pedido.requester_id);
  const aName  = getName(pedido.assignee_id, pedido.assignee_name);
  const aPhoto = getPhoto(pedido.assignee_id);
  const bar = pedido.prioridade === "critica" ? "before:bg-red-500" : pedido.prioridade === "alta" ? "before:bg-orange-400" : "";

  return (
    <button
      onClick={() => onSelect(pedido)}
      className={`group relative flex w-full items-center ${COL.gap} ${COL.px} py-3.5 text-left transition-all border-b border-gray-100 hover:bg-blue-50/30 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r ${bar} ${isSelected ? "bg-blue-50/50" : ""}`}
    >
      <div className={COL.cliente}><ClientBadge name={pedido.workshop_nome} /></div>
      <div className={`${COL.solicitante} flex items-center gap-2`}>
        <MiniAvatar name={rName} photoUrl={rPhoto} />
        <div className="min-w-0">
          <p className={`text-[12px] font-medium truncate ${done ? "text-gray-400" : "text-gray-800"}`}>{rName}</p>
          <p className="font-mono text-[9px] text-gray-400 leading-none">#{pedido.id?.slice(-6).toUpperCase()}</p>
        </div>
      </div>
      <div className={`${COL.responsavel} flex items-center gap-2`}>
        {aName ? (
          <>
            <MiniAvatar name={aName} photoUrl={aPhoto} />
            <span className={`text-[12px] font-medium truncate ${done ? "text-gray-400" : "text-gray-700"}`}>{aName}</span>
          </>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>
      <div className={`${COL.prioridade} flex justify-center`}><PriorityBadge prioridade={pedido.prioridade} /></div>
      <div className={`${COL.status} flex justify-center`}><StatusPill status={pedido.status} /></div>
      <div className={`${COL.sla} flex items-center justify-end gap-1`}>
        <Clock className="h-3 w-3 text-gray-400" />
        <span className={`text-[11px] tabular-nums ${slaColor(criado)}`}>{timeSince(criado) || "—"}</span>
      </div>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div>
      {[0,1].map(g => (
        <React.Fragment key={g}>
          <div className="flex items-center gap-3 border-y border-gray-200 bg-white px-5 py-3 animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-4 w-6 rounded-full bg-gray-200" />
          </div>
          {[0,1,2].map(r => (
            <div key={r} className={`flex items-center ${COL.gap} ${COL.px} py-3.5 border-b border-gray-100 animate-pulse`}>
              <div className={COL.cliente}><div className="h-5 w-28 rounded bg-gray-100" /></div>
              <div className={`${COL.solicitante} flex items-center gap-2`}><div className="h-[22px] w-[22px] rounded-full bg-gray-200" /><div className="h-3.5 w-20 rounded bg-gray-200" /></div>
              <div className={`${COL.responsavel} flex items-center gap-2`}><div className="h-[22px] w-[22px] rounded-full bg-gray-200" /><div className="h-3.5 w-20 rounded bg-gray-200" /></div>
              <div className={`${COL.prioridade} flex justify-center`}><div className="h-5 w-16 rounded-full bg-gray-100" /></div>
              <div className={`${COL.status} flex justify-center`}><div className="h-6 w-20 rounded-full bg-gray-100" /></div>
              <div className={`${COL.sla} flex justify-end`}><div className="h-4 w-14 rounded bg-gray-100" /></div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

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
            <GroupHeader group={group} count={items.length} collapsed={!!collapsed[group.key]} onToggle={() => toggle(group.key)} />
            {!collapsed[group.key] && (
              items.length === 0 ? (
                <div className="px-6 py-5 text-sm text-gray-400 italic border-b border-gray-100">Nenhum pedido</div>
              ) : (
                items.map(pedido => (
                  <TicketRow key={pedido.id} pedido={pedido} onSelect={onSelect} isSelected={pedido.id === selectedId} getName={getName} getPhoto={getPhoto} />
                ))
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
