import React from "react";

function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function LegacyBlock({ data }) {
  const legacy = data.legacy || {};
  const TOTAL_SEALED = 3;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">🔒 Endpoints Legados Selados</h2>
      <p className="text-xs text-gray-400 mb-4">Qualquer chamada indica uso de fluxo desatualizado</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard label="Endpoints Selados" value={TOTAL_SEALED} color="text-gray-600" />
        <StatCard label="Chamadas 24h" value={legacy.calls_24h ?? 0} color={legacy.calls_24h > 0 ? "text-red-600" : "text-green-600"} />
        <StatCard label="Chamadas 7d" value={legacy.calls_7d ?? 0} color={legacy.calls_7d > 0 ? "text-orange-600" : "text-green-600"} />
        <StatCard label="Chamadas 30d" value={legacy.calls_30d ?? 0} color={legacy.calls_30d > 0 ? "text-orange-600" : "text-green-600"} />
      </div>
      {legacy.calls_24h === 0 && legacy.calls_7d === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          ✅ Nenhuma chamada legacy detectada nos últimos 7 dias
        </div>
      )}
      {legacy.calls_24h > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          🚨 Chamadas legacy detectadas nas últimas 24h — verificar fluxo
        </div>
      )}
    </div>
  );
}