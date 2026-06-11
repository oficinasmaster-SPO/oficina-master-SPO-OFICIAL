import React from "react";

const ISSUE_CONFIG = {
  workshops_without_owner:    { label: "Workshop sem Owner",         icon: "🔴" },
  owners_with_wrong_profile:  { label: "Owner com Perfil Incorreto", icon: "🔴" },
  orphan_users:               { label: "User Órfão",                 icon: "🔴" },
  employees_orphaned:         { label: "Employee Órfão",             icon: "🔴" },
  duplicate_users:            { label: "Duplicate User",             icon: "🔴" },
  duplicate_employees:        { label: "Duplicate Employee",         icon: "🔴" },
  legacy_calls:               { label: "Legacy Endpoint Chamado",    icon: "🔴" },
};

export default function CriticalIssuesBlock({ data }) {
  const g = data.governance || {};
  const leg = data.legacy || {};

  const issues = [
    { key: "workshops_without_owner",   value: g.workshops_without_owner   ?? 0 },
    { key: "owners_with_wrong_profile", value: g.owners_with_wrong_profile ?? 0 },
    { key: "orphan_users",              value: g.orphan_users              ?? 0 },
    { key: "employees_orphaned",        value: g.employees_orphaned        ?? 0 },
    { key: "duplicate_users",           value: g.duplicate_users           ?? 0 },
    { key: "duplicate_employees",       value: g.duplicate_employees       ?? 0 },
    { key: "legacy_calls",              value: leg.calls_24h               ?? 0 },
  ].filter(i => i.value > 0);

  return (
    <div className={`rounded-xl border-2 p-5 ${issues.length > 0 ? "bg-red-50 border-red-300" : "bg-green-50 border-green-200"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{issues.length > 0 ? "🚨" : "✅"}</span>
        <h2 className="text-base font-semibold text-gray-900">Problemas Críticos</h2>
        {issues.length > 0 && (
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-bold">
            {issues.length} problema{issues.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {issues.length === 0 ? (
        <p className="text-sm text-green-700 font-medium">Nenhum problema crítico encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {issues.map(issue => {
            const cfg = ISSUE_CONFIG[issue.key];
            return (
              <div key={issue.key} className="flex items-center gap-3 bg-white rounded-lg border border-red-200 px-4 py-3 shadow-sm">
                <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{cfg.label}</p>
                  <p className="text-xl font-bold text-red-700">{issue.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}