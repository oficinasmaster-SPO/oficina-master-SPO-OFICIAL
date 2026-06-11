import React from "react";

function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function RecoveryBlock({ data }) {
  const r = data.recovery;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">🔄 Recovery Health</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Recuperados (7d)" value={r.recoveries_7d} color="text-green-600" />
        <StatCard label="Recuperados (30d)" value={r.recoveries_30d} color="text-green-600" />
        <StatCard label="Desativados (7d)" value={r.deactivated_7d} color={r.deactivated_7d > 0 ? "text-orange-600" : "text-gray-500"} />
        <StatCard label="Desativados (30d)" value={r.deactivated_30d} color={r.deactivated_30d > 0 ? "text-orange-600" : "text-gray-500"} />
      </div>
    </div>
  );
}