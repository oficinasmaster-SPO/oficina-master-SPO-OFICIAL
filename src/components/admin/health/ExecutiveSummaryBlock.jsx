import React from "react";

function SummaryCard({ label, value, icon, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className="text-3xl flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value ?? "–"}</p>
      </div>
    </div>
  );
}

export default function ExecutiveSummaryBlock({ data }) {
  const g    = data.governance  || {};
  const totals = data.totals    || {};

  const total_users     = totals.users      ?? "–";
  const total_employees = totals.employees  ?? "–";
  const total_workshops = totals.workshops  ?? "–";
  const total_owners    = totals.owners     ?? "–";
  const invites_pending = g.invites_pending ?? "–";
  const health_score    = data.health_score ?? "–";

  const scoreColor = health_score >= 80 ? "text-green-600" : health_score >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
        Resumo Executivo · leitura em &lt;10s
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard icon="👤" label="Total Users"     value={total_users}     />
        <SummaryCard icon="👷" label="Employees"       value={total_employees} />
        <SummaryCard icon="🏭" label="Workshops"       value={total_workshops} />
        <SummaryCard icon="👑" label="Owners"          value={total_owners}    />
        <SummaryCard icon="📨" label="Convites Pend."  value={invites_pending} />
        <SummaryCard icon="💊" label="Health Score"    value={health_score}    color={scoreColor} />
      </div>
    </div>
  );
}