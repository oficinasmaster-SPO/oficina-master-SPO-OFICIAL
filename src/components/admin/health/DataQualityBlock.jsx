import React, { useState } from "react";

function KpiCard({ label, value, status = "neutral", note = null }) {
  const styles = {
    critical: value > 0
      ? "bg-red-50 border-red-300 text-red-700"
      : "bg-green-50 border-green-200 text-green-700",
    warning: value > 0
      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
      : "bg-green-50 border-green-200 text-green-700",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
    neutral: "bg-white border-gray-200 text-gray-900",
  };
  const cls = styles[status] || styles.neutral;
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <p className="text-xs text-gray-500 truncate mb-1">{label}</p>
      <p className="text-2xl font-bold">{value ?? "–"}</p>
      {note && <p className="text-xs mt-1 opacity-70">{note}</p>}
    </div>
  );
}

function DuplicateEmployeesList({ groups }) {
  const [expanded, setExpanded] = useState(false);
  if (!groups || groups.length === 0) return null;
  const visible = expanded ? groups : groups.slice(0, 5);
  return (
    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-red-700">
          {groups.length} grupo{groups.length > 1 ? "s" : ""} com user_id duplicado
        </p>
        <span className="text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
          Critério: mesmo user_id em &gt;1 Employee
        </span>
      </div>
      <div className="space-y-2">
        {visible.map((g, i) => (
          <div key={i} className="bg-white rounded border border-red-100 p-2">
            <p className="text-xs font-mono text-gray-500 mb-1 truncate">user_id: {g.user_id} · {g.count} registros</p>
            {g.records.map((r, j) => (
              <div key={j} className="flex items-center gap-2 text-xs text-gray-700 py-0.5 border-t border-gray-50 first:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="font-medium truncate flex-1">{r.full_name || "—"}</span>
                <span className="text-gray-400 truncate max-w-[140px]">{r.email}</span>
                <span className="text-gray-400 font-mono text-[10px] flex-shrink-0">{r.job_role}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {groups.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
        >
          {expanded ? "▲ Mostrar menos" : `▼ Ver mais ${groups.length - 5} grupos`}
        </button>
      )}
    </div>
  );
}

export default function DataQualityBlock({ data }) {
  const g = data.governance || {};

  const duplicate_employee_groups = g.duplicate_employee_groups || [];
  const orphan_users     = g.orphan_users          ?? 0;
  const orphan_employees = g.employees_orphaned     ?? 0;
  const pending_invite   = g.employees_pending_invite ?? 0;
  const duplicate_users  = g.duplicate_users        ?? 0;
  const duplicate_emps   = g.duplicate_employees    ?? 0;
  const no_employee      = g.users_without_employee ?? 0;
  const no_owner         = g.workshops_without_owner ?? 0;

  const realIssues = orphan_users + orphan_employees + duplicate_users + duplicate_emps + no_owner;
  let blockStatus = "SAFE";
  if (realIssues > 0) blockStatus = "CRITICAL";

  const statusCfg = {
    CRITICAL: { emoji: "🚨", cls: "bg-red-50 border-red-200 text-red-700" },
    SAFE:     { emoji: "✅", cls: "bg-green-50 border-green-200 text-green-700" },
  }[blockStatus];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">🧹 Qualidade dos Dados</h2>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.cls}`}>
          {statusCfg.emoji} {blockStatus}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Employees Pending Invite <strong>não</strong> são considerados órfãos — são estado esperado do sistema.
      </p>

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Duplicatas</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KpiCard label="Duplicate Users"     value={duplicate_users} status="critical" />
        <KpiCard label="Duplicate Employees" value={duplicate_emps}  status="critical" />
      </div>
      {duplicate_emps > 0 && <DuplicateEmployeesList groups={duplicate_employee_groups} />}

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Órfãos Reais</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Orphan Users"            value={orphan_users}     status="critical" />
        <KpiCard label="Employees Órfãos Reais"  value={orphan_employees} status="critical" note="Excluídos pending invite" />
        <KpiCard label="Workshops sem Owner"     value={no_owner}         status="critical" />
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Referências Quebradas</p>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Users sem Employee"       value={no_employee}    status="warning" />
        <KpiCard label="Employees Pending Invite" value={pending_invite} status="info" note="Estado esperado — não reduz score" />
      </div>
    </div>
  );
}