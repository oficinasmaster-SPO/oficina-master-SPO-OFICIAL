import React from "react";

const FUNCTION_LABELS = {
  auditRBACHealth: "Audit RBAC Health",
  cleanupExpiredInvites: "Cleanup Expired Invites",
  cleanupAbandonedWorkshops: "Cleanup Abandoned Workshops",
};

function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-gray-400">–</span>;
  const map = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error:   "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status.toUpperCase()}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return "Nunca";
  try {
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

export default function AutomationsBlock({ data }) {
  const automations = data.automations || {};

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">⚙️ Automações Monitoradas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Função</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Última Execução</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duração</th>
              <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Processados</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Erros 7d</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(automations).map(([key, val]) => (
              <tr key={key} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 font-medium text-gray-800">{FUNCTION_LABELS[key] || key}</td>
                <td className="py-3 pr-4 text-gray-600">{formatDate(val.last_run)}</td>
                <td className="py-3 pr-4"><StatusBadge status={val.last_status} /></td>
                <td className="py-3 pr-4 text-right text-gray-600">{val.last_duration_ms != null ? `${val.last_duration_ms}ms` : "–"}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{val.last_processed ?? "–"}</td>
                <td className={`py-3 text-right font-medium ${val.errors_7d > 0 ? "text-red-600" : "text-green-600"}`}>{val.errors_7d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}