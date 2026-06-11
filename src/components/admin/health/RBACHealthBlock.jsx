import React from "react";

function KpiCard({ label, value, status = "neutral", suffix = "" }) {
  const styles = {
    critical: value > 0
      ? "bg-red-50 border-red-300 text-red-700"
      : "bg-green-50 border-green-200 text-green-700",
    warning: value > 0
      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
      : "bg-green-50 border-green-200 text-green-700",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
    good:    "bg-green-50 border-green-200 text-green-700",
    neutral: "bg-white border-gray-200 text-gray-900",
  };
  return (
    <div className={`rounded-lg border p-4 ${styles[status] || styles.neutral}`}>
      <p className="text-xs text-gray-500 truncate mb-1">{label}</p>
      <p className="text-2xl font-bold">{value ?? "–"}{suffix}</p>
    </div>
  );
}

function CoverageBar({ pct }) {
  const color = pct >= 95 ? "bg-green-500" : pct >= 80 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Cobertura RBAC</span>
        <span className="font-semibold text-gray-800">{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RBACHealthBlock({ data }) {
  const g = data.governance || {};
  const rbac_health           = g.rbac_health           ?? 100;
  const owners_with_wrong     = g.owners_with_wrong_profile ?? 0;
  const missing_profiles      = data.missing_profiles   ?? 0;
  const profile_mismatches    = data.profile_mismatches ?? 0;
  const invalid_roles         = data.invalid_roles      ?? 0;
  const owners_correct        = data.rbac?.owners_correct ?? "–";
  const owners_total          = data.rbac?.owners_total   ?? "–";

  let blockStatus = "SAFE";
  if (owners_with_wrong > 0) blockStatus = "CRITICAL";
  else if (profile_mismatches > 0 || missing_profiles > 0) blockStatus = "WARNING";

  const statusCfg = {
    CRITICAL: { emoji: "🚨", cls: "bg-red-50 border-red-200 text-red-700" },
    WARNING:  { emoji: "⚠️", cls: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    SAFE:     { emoji: "✅", cls: "bg-green-50 border-green-200 text-green-700" },
  }[blockStatus];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">🛡️ RBAC Health</h2>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.cls}`}>
          {statusCfg.emoji} {blockStatus}
        </span>
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Owners</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KpiCard label="Owners Corretos"      value={owners_correct} status="good" />
        <KpiCard label="Owners Perfil Errado" value={owners_with_wrong} status="critical" />
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Profiles & Roles</p>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Employees sem Profile" value={missing_profiles}   status="warning" />
        <KpiCard label="Profile Mismatch"      value={profile_mismatches} status="warning" />
        <KpiCard label="Invalid Roles"         value={invalid_roles}      status="warning" />
      </div>

      <CoverageBar pct={rbac_health} />

      {blockStatus === "SAFE" && (
        <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✅ 100% conformidade RBAC — nenhum problema detectado.
        </p>
      )}
    </div>
  );
}