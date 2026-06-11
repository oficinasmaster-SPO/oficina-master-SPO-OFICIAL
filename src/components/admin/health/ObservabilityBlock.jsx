import React from "react";

function StatCard({ label, value, color = "text-gray-900", suffix = "" }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value != null ? `${value}${suffix}` : "–"}</p>
    </div>
  );
}

export default function ObservabilityBlock({ data }) {
  const obs = data.observability || {};
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">📡 Observabilidade</h2>
      <p className="text-xs text-gray-400 mb-4">Últimos 7 dias</p>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Funções Executadas" value={obs.functions_executed_7d} />
        <StatCard label="Com Erros/Warning" value={obs.functions_error_7d} color={obs.functions_error_7d > 0 ? "text-red-600" : "text-green-600"} />
        <StatCard label="Taxa de Falha" value={obs.failure_rate_7d} suffix="%" color={obs.failure_rate_7d > 5 ? "text-red-600" : "text-green-600"} />
        <StatCard label="Duração Média" value={obs.avg_duration_ms_7d} suffix="ms" />
      </div>
    </div>
  );
}