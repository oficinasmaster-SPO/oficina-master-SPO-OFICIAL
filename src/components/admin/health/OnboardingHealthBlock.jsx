import React from "react";

function StatCard({ label, value, color = "text-gray-900", suffix = "" }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}{suffix}</p>
    </div>
  );
}

export default function OnboardingHealthBlock({ data }) {
  const g = data.governance;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">📨 Onboarding Health</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pendentes" value={g.invites_pending} color={g.invites_pending > 10 ? "text-yellow-600" : "text-gray-900"} />
        <StatCard label="Expirados" value={g.invites_expired} color={g.invites_expired > 0 ? "text-red-600" : "text-green-600"} />
        <StatCard label="Aceitos" value={g.invites_accepted} color="text-green-600" />
        <StatCard label="Total Convites" value={g.invites_total} />
      </div>
      <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
        <p className="text-xs text-blue-500 mb-0.5">Taxa de Conversão</p>
        <p className="text-2xl font-bold text-blue-700">{g.invite_conversion_rate}%</p>
      </div>
    </div>
  );
}