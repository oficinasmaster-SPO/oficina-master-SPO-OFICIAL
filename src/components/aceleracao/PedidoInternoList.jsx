import React from "react";
import UserAvatar from "@/components/shared/UserAvatar";
import StatusBadge from "@/components/shared/StatusBadge";
import PriorityBadge from "@/components/shared/PriorityBadge";

function formatPrazo(prazo) {
  if (!prazo) return "Sem prazo";
  const date = new Date(prazo);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Hoje ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (isYesterday) return `Ontem ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isVencido(p) {
  if (!p.prazo) return false;
  if (["concluido", "recusado"].includes(p.status)) return false;
  return new Date(p.prazo) < new Date();
}

export default function PedidoInternoList({ pedidos, onSelect, isLoading }) {
  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-56 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {pedidos.map((pedido) => (
        <button
          key={pedido.id}
          onClick={() => onSelect(pedido)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50/40"
        >
          <UserAvatar name={pedido.requester_name || "?"} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                {pedido.requester_name || "—"}
              </span>
              <div className="flex items-center gap-1.5">
                <PriorityBadge prioridade={pedido.prioridade} className="text-[10px]" />
                <StatusBadge entity="pedido" status={pedido.status} className="text-[10px]" />
              </div>
            </div>
            <p className="truncate text-sm text-gray-700">{pedido.titulo}</p>
            {pedido.workshop_nome && (
              <p className="truncate text-xs text-gray-400">{pedido.workshop_nome}</p>
            )}
          </div>

          <div className="flex flex-col items-end justify-center pt-1">
            <span className={`text-xs ${isVencido(pedido) ? "font-semibold text-red-600" : "text-gray-400"}`}>
              {formatPrazo(pedido.prazo)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}