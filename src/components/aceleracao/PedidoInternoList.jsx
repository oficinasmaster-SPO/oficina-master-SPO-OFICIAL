import React, { useState, useCallback } from "react";
import { Clock, AlertTriangle, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight, MessageSquare, ClipboardList, CheckCircle2, Search as SearchIcon } from "lucide-react";
import { PEDIDO_STATUS_CONFIG, PRIORIDADE_CONFIG } from "@/components/shared/backlogConstants";

// ── Grupos de status ────────────────────────────────────────────────────────
const STATUS_GROUPS = [
  {
    key: "em_analise",
    label: "Em Análise",
    icon: SearchIcon,
    iconClass: "text-blue-500",
    headerClass: "bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-500",
  },
  {
    key: "pendente",
    label: "Pendente",
    icon: ClipboardList,
    iconClass: "text-gray-500",
    headerClass: "bg-gray-50 border-gray-200",
    badgeClass: "bg-gray-400",
  },
  {
    key: "aprovado",
    label: "Aprovado",
    icon: CheckCircle2,
    iconClass: "text-green-500",
    headerClass: "bg-green-50 border-green-200",
    badgeClass: "bg-green-500",
  },
  {
    key: "recusado",
    label: "Recusado",
    icon: AlertTriangle,
    iconClass: "text-red-500",
    headerClass: "bg-red-50 border-red-200",
    badgeClass: "bg-red-500",
    defaultCollapsed: true,
  },
  {
    key: "concluido",
    label: "Concluído",
    icon: CheckCircle2,
    iconClass: "text-purple-500",
    headerClass: "bg-purple-50 border-purple-200",
    badgeClass: "bg-purple-500",
    defaultCollapsed: true,
  },
];

// ── Helpers visuais ─────────────────────────────────────────────────────────
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

function isVencido(p) {
  if (!p.prazo) return false;
  if (["concluido", "recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

function Avatar({ name }) {
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const COLORS = [
    "bg-blue-500","bg-violet-500","bg-teal-500","bg-orange-500",
    "bg-pink-500","bg-cyan-500","bg-indigo-500","bg-amber-500",
  ];
  const ci = name ? name.charCodeAt(0) % COLORS.length : 0;
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${COLORS[ci]}`}>
      {initials}
    </span>
  );
}

function PriorityIcon({ prioridade }) {
  if (prioridade === "critica") return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  if (prioridade === "alta")    return <ArrowUp       className="h-3.5 w-3.5 text-orange-500" />;
  if (prioridade === "media")   return <Minus         className="h-3.5 w-3.5 text-yellow-500" />;
  return                               <ArrowDown     className="h-3.5 w-3.5 text-blue-400"  />;
}

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

// ── Cabeçalho de grupo colapsável ────────────────────────────────────────────
function GroupHeader({ group, count, collapsed, onToggle }) {
  const Icon = group.icon;
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2 border-y px-3 py-2 text-left transition-colors hover:brightness-95 ${group.headerClass}`}
    >
      {collapsed
        ? <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        : <ChevronDown  className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      <Icon className={`h-3.5 w-3.5 shrink-0 ${group.iconClass}`} />
      <span className="text-xs font-semibold text-gray-700">{group.label}</span>
      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${group.badgeClass}`}>
        {count}
      </span>
    </button>
  );
}

// ── Linha de ticket ──────────────────────────────────────────────────────────
function TicketRow({ pedido, onSelect, isSelected }) {
  const vencido = isVencido(pedido);
  const criado  = pedido.created_date || pedido.data_criacao;
  const done    = ["concluido", "recusado"].includes(pedido.status);

  return (
    <button
      onClick={() => onSelect(pedido)}
      className={`
        group flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left
        transition-colors hover:bg-blue-50/60 border-l-2
        ${isSelected ? "bg-blue-50 border-l-blue-500"
          : vencido  ? "border-l-red-400"
          : "border-l-transparent"}
      `}
    >
      {/* Avatar */}
      <Avatar name={pedido.requester_name || "?"} />

      {/* Info central */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-gray-400 shrink-0">
            #{pedido.id?.slice(-6).toUpperCase()}
          </span>
          <span className={`truncate text-sm font-semibold ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {pedido.requester_name || "—"}
          </span>
        </div>
        <p className={`truncate text-sm ${done ? "text-gray-400" : "text-gray-600"}`}>
          {pedido.titulo}
        </p>
        {pedido.workshop_nome && (
          <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            {pedido.workshop_nome}
          </span>
        )}
      </div>

      {/* Coluna direita */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <PriorityIcon prioridade={pedido.prioridade} />
          <TimerChip dateStr={criado} vencido={vencido} />
        </div>
        {/* Assignee */}
        {pedido.assignee_name && (
          <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
            → {pedido.assignee_name}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
          <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-gray-200" />
            <div className="h-3 w-52 rounded bg-gray-100" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="h-4 w-12 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function PedidoInternoList({ pedidos, onSelect, isLoading, selectedId }) {
  // Grupos colapsados por padrão (concluido e recusado)
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ClipboardList className="mb-3 h-10 w-10 text-gray-200" />
        <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
      </div>
    );
  }

  // Agrupar pedidos por status
  const grouped = {};
  STATUS_GROUPS.forEach(g => { grouped[g.key] = []; });
  pedidos.forEach(p => {
    if (grouped[p.status] !== undefined) grouped[p.status].push(p);
  });

  // Ordenar cada grupo: vencidos primeiro, depois por criação mais recente
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const vA = isVencido(a) ? 0 : 1;
      const vB = isVencido(b) ? 0 : 1;
      if (vA !== vB) return vA - vB;
      const dA = new Date(a.created_date || a.data_criacao || 0);
      const dB = new Date(b.created_date || b.data_criacao || 0);
      return dB - dA; // mais recente primeiro
    });
  });

  return (
    <div>
      {STATUS_GROUPS.map(group => {
        const items = grouped[group.key] || [];
        // Não renderizar grupo vazio (exceto pendente — sempre mostrar)
        if (items.length === 0 && group.key !== "pendente") return null;

        const isCollapsed = !!collapsed[group.key];

        return (
          <div key={group.key}>
            <GroupHeader
              group={group}
              count={items.length}
              collapsed={isCollapsed}
              onToggle={() => toggleGroup(group.key)}
            />

            {!isCollapsed && (
              <>
                {items.length === 0 ? (
                  <div className="px-4 py-3 text-xs italic text-gray-400">
                    Nenhum pedido
                  </div>
                ) : (
                  items.map(pedido => (
                    <TicketRow
                      key={pedido.id}
                      pedido={pedido}
                      onSelect={onSelect}
                      isSelected={pedido.id === selectedId}
                    />
                  ))
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
