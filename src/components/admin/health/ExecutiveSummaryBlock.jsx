import React from "react";

const MODULE_STATUS_FN = (data) => {
  const g   = data.governance  || {};
  const obs = data.observability || {};
  const leg = data.legacy       || {};

  const gov = (g.workshops_without_owner > 0 || g.duplicate_users > 0 || g.duplicate_employees > 0 || g.employees_orphaned > 0)
    ? "CRITICAL" : "SAFE";
  const rbac = g.owners_with_wrong_profile > 0
    ? "CRITICAL" : (data.profile_mismatches > 0) ? "WARNING" : "SAFE";
  const onboarding = g.invites_pending > 20
    ? "WARNING" : (g.invites_expired > 5) ? "WARNING" : "SAFE";
  const quality = (g.orphan_users > 0 || g.employees_orphaned > 0 || g.workshops_without_owner > 0)
    ? "CRITICAL" : (g.users_without_employee > 10) ? "WARNING" : "SAFE";
  const recovery = "SAFE";
  const legacy = leg.calls_24h > 0 ? "CRITICAL" : leg.calls_7d > 0 ? "WARNING" : "SAFE";
  const observability = (obs.failure_rate_7d > 10) ? "WARNING" : "SAFE";

  return { gov, rbac, onboarding, quality, recovery, legacy, observability };
};

const EMOJI = { SAFE: "🟢", WARNING: "🟡", CRITICAL: "🔴" };

const MODULES = [
  { key: "gov",           label: "Governança"      },
  { key: "rbac",          label: "RBAC"            },
  { key: "onboarding",    label: "Onboarding"      },
  { key: "quality",       label: "Qualidade"       },
  { key: "recovery",      label: "Recovery"        },
  { key: "legacy",        label: "Legacy"          },
  { key: "observability", label: "Observabilidade" },
];

function MetricCard({ icon, label, value, color = "text-gray-900", small = false }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider leading-tight">{label}</p>
        <p className={`${small ? "text-xl" : "text-2xl"} font-bold ${color}`}>{value ?? "–"}</p>
      </div>
    </div>
  );
}

export default function ExecutiveSummaryBlock({ data }) {
  const g      = data.governance || {};
  const totals = data.totals     || {};
  const score  = data.health_score ?? "–";

  const scoreColor = score >= 90 ? "text-green-600"
    : score >= 70 ? "text-yellow-600"
    : "text-red-600";

  const mods = MODULE_STATUS_FN(data);

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
        <MetricCard icon="💊" label="Health Score"   value={score}              color={scoreColor} />
        <MetricCard icon="🚦" label="Status"         value={data.status ?? "–"} />
        <MetricCard icon="👤" label="Total Users"    value={totals.users}       />
        <MetricCard icon="👷" label="Employees"      value={totals.employees}   />
        <MetricCard icon="🏭" label="Workshops"      value={totals.workshops}   />
        <MetricCard icon="👑" label="Owners"         value={totals.owners}      />
        <MetricCard icon="📨" label="Conv. Pendentes" value={g.invites_pending ?? "–"} />
      </div>

      {/* Module status strip */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        {MODULES.map(m => (
          <div key={m.key} className="flex items-center gap-1.5 text-sm text-gray-700">
            <span className="text-base">{EMOJI[mods[m.key]] || "⚪"}</span>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}