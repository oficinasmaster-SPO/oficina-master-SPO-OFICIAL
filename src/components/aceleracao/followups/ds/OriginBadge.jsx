import React from "react";

const ORIGIN_CONFIG = {
  ata:            { label: "FU Ata",       className: "bg-purple-50 text-purple-700 border-purple-200" },
  sprint:         { label: "Sprint",       className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  manual:         { label: "Manual",       className: "bg-gray-100 text-gray-600 border-gray-200" },
  suporte:        { label: "Suporte",      className: "bg-blue-50 text-blue-700 border-blue-200" },
  suporte_checkin:{ label: "Check-in",    className: "bg-blue-50 text-blue-700 border-blue-200" },
  guarda_chuva:   { label: "Guarda-chuva",className: "bg-amber-50 text-amber-700 border-amber-200" },
  tarefa_backlog: { label: "Tarefa",       className: "bg-orange-50 text-orange-700 border-orange-200" },
  pedido_interno: { label: "Pedido",       className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
};

export default function OriginBadge({ originType, className = "" }) {
  const cfg = ORIGIN_CONFIG[originType] || ORIGIN_CONFIG.manual;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}

export { ORIGIN_CONFIG };
