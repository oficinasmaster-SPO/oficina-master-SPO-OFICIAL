import React from "react";

function KpiCard({ label, value, critical = false, warning = false, info = false, suffix = "" }) {
  let bg = "bg-white", border = "border-gray-200", text = "text-gray-900";
  if (critical && value > 0) { bg = "bg-red-50"; border = "border-red-300"; text = "text-red-700"; }
  else if (warning && value > 0) { bg = "bg-yellow-50"; border = "border-yellow-300"; text = "text-yellow-700"; }
  else if (info) { bg = "bg-blue-50"; border = "border-blue-200"; text = "text-blue-700"; }
  else if (critical && value === 0) { bg = "bg-green-50"; border = "border-green-200"; text = "text-green-700"; }

  return (
    <div className={`rounded-lg border ${border} ${bg} p-4`}>
      <p className="text-xs text-gray-500 truncate mb-1">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}{suffix}</p>
    </div>
  );
}

export default function GovernanceBlock({ data }) {
  const g = data.governance;

  const totalWorkshops = data.recovery?.recoveries_30d !== undefined
    ? null
    : null;

  // Cobertura de governança: owners_correct / workshops (aproximado)
  const wrongProfile = g.owners_with_wrong_profile || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">🏛️ Governança e Identidade</h2>

      {/* Linha 1 — Críticos */}
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Problemas Críticos</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
        <KpiCard label="Duplicate Users" value={g.duplicate_users} critical />
        <KpiCard label="Duplicate Employees" value={g.duplicate_employees} critical />
        <KpiCard label="Workshops s/ Owner" value={g.workshops_without_owner} critical />
        <KpiCard label="Owners Perfil Errado" value={g.owners_with_wrong_profile} critical />
        <KpiCard label="Employees Órfãos" value={g.employees_orphaned} critical />
        <KpiCard label="Users s/ Employee" value={g.users_without_employee} warning />
        <KpiCard label="Employees Pendentes" value={g.employees_pending_invite} info />
      </div>

      {/* Linha 2 — Totais */}
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Totais do Sistema</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Profiles" value={data.governance ? (data.governance.invites_total !== undefined ? "–" : "–") : "–"} />
        <KpiCard label="RBAC Health" value={g.rbac_health} suffix="%" />
        <KpiCard label="Profile Mismatches" value={data.profile_mismatches ?? "–"} warning />
        <KpiCard label="Invalid Roles" value={data.invalid_roles ?? "–"} warning />
        <KpiCard label="Missing Profiles" value={data.missing_profiles ?? "–"} warning />
        <KpiCard label="Conversion Rate" value={g.invite_conversion_rate} suffix="%" />
      </div>
    </div>
  );
}