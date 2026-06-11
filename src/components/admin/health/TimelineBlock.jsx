import React, { useState } from "react";

const EVENT_CONFIG = {
  WORKSHOP_RECOVERY:       { icon: "🟢", label: "Workshop Recuperado",       color: "text-green-600",  category: "recovery" },
  WORKSHOP_DEACTIVATED:    { icon: "🔴", label: "Workshop Desativado",        color: "text-red-600",    category: "recovery" },
  OWNER_EMPLOYEE_CREATED:  { icon: "🔵", label: "Employee Placeholder",      color: "text-blue-600",   category: "recovery" },
  FUNCTION_EXECUTED:       { icon: "⚙️", label: "Função Executada",           color: "text-gray-600",   category: "governance" },
  LEGACY_ENDPOINT_CALLED:  { icon: "⚠️", label: "Endpoint Legacy Chamado",   color: "text-orange-600", category: "legacy" },
  OWNER_PROFILE_CORRECTED: { icon: "🔧", label: "Profile Owner Corrigido",   color: "text-indigo-600", category: "governance" },
  USER_CREATED:            { icon: "👤", label: "Usuário Criado",             color: "text-blue-500",   category: "onboarding" },
  INVITE_CREATED:          { icon: "📨", label: "Convite Criado",             color: "text-cyan-600",   category: "onboarding" },
  INVITE_ACCEPTED:         { icon: "✅", label: "Convite Aceito",             color: "text-green-500",  category: "onboarding" },
  INVITE_EXPIRED:          { icon: "⏰", label: "Convite Expirado",           color: "text-red-500",    category: "onboarding" },
  USER_PENDING_WORKSHOP:   { icon: "🕐", label: "User Pending Workshop",      color: "text-yellow-600", category: "onboarding" },
  SECURITY_EVENT:          { icon: "🛡️", label: "Evento de Segurança",        color: "text-red-700",    category: "security" },
};

const FILTERS = [
  { key: "all",        label: "Todos" },
  { key: "governance", label: "Governança" },
  { key: "onboarding", label: "Onboarding" },
  { key: "recovery",   label: "Recovery" },
  { key: "security",   label: "Segurança" },
  { key: "legacy",     label: "Legacy" },
];

function formatTs(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

export default function TimelineBlock({ data }) {
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const timeline = data.timeline || [];

  const filtered = activeFilter === "all"
    ? timeline
    : timeline.filter(evt => {
        const cfg = EVENT_CONFIG[evt.event_type];
        return cfg?.category === activeFilter;
      });

  const visible = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-3">📋 Timeline Global</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setActiveFilter(f.key); setShowAll(false); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === f.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-3">🕳️</p>
          <p className="text-sm">Nenhum evento nesta categoria.</p>
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
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{evt.details.function_name}</p>
                  )}
                  {evt.details?.caller_email && (
                    <p className="text-xs text-gray-400 mt-0.5">by {evt.details.caller_email}</p>
                  )}
                  {evt.entity_type && evt.entity_type !== "RBACHealth" && (
                    <p className="text-xs text-gray-400 mt-0.5">{evt.entity_type}</p>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-xs text-blue-600 hover:text-blue-800 py-2 font-medium"
            >
              Ver todos ({filtered.length} eventos)
            </button>
          )}
        </div>
      )}
    </div>
  );
}