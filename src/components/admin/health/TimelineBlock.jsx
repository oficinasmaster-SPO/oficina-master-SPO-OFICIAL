import React, { useState } from "react";

const EVENT_CONFIG = {
  WORKSHOP_RECOVERY:      { icon: "🟢", label: "Workshop Recuperado",      color: "text-green-600" },
  WORKSHOP_DEACTIVATED:   { icon: "🔴", label: "Workshop Desativado",       color: "text-red-600" },
  OWNER_EMPLOYEE_CREATED: { icon: "🔵", label: "Employee Placeholder Criado", color: "text-blue-600" },
  FUNCTION_EXECUTED:      { icon: "⚙️", label: "Função Executada",           color: "text-gray-600" },
  LEGACY_ENDPOINT_CALLED: { icon: "⚠️", label: "Endpoint Legacy Chamado",   color: "text-orange-600" },
};

function formatTs(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

export default function TimelineBlock({ data }) {
  const [showAll, setShowAll] = useState(false);
  const timeline = data.timeline || [];
  const visible = showAll ? timeline : timeline.slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">📋 Timeline Global</h2>

      {timeline.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-3">🕳️</p>
          <p className="text-sm">Nenhum evento registrado ainda.</p>
          <p className="text-xs mt-1">Execute as automações para popular a timeline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((evt, i) => {
            const cfg = EVENT_CONFIG[evt.event_type] || { icon: "📌", label: evt.event_type, color: "text-gray-600" };
            return (
              <div key={i} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <span className="text-lg leading-none mt-0.5 flex-shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTs(evt.timestamp)}</span>
                  </div>
                  {evt.details?.reason && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{evt.details.reason}</p>
                  )}
                  {evt.details?.function_name && (
                    <p className="text-xs text-gray-400 mt-0.5">{evt.details.function_name}</p>
                  )}
                  {evt.entity_type && evt.entity_type !== "RBACHealth" && (
                    <p className="text-xs text-gray-400 mt-0.5">{evt.entity_type}</p>
                  )}
                </div>
              </div>
            );
          })}
          {timeline.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-xs text-blue-600 hover:text-blue-800 py-2 font-medium"
            >
              Ver todos ({timeline.length} eventos)
            </button>
          )}
        </div>
      )}
    </div>
  );
}