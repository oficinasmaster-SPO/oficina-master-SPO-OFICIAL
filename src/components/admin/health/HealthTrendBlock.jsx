import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const METRICS = [
  { key: "health_score",          label: "Health Score",        color: "#22c55e" },
  { key: "users_without_employee",label: "Users s/ Employee",   color: "#f59e0b" },
  { key: "workshops_without_owner",label: "Workshops s/ Owner", color: "#ef4444" },
  { key: "invites_expired",       label: "Invites Expirados",   color: "#8b5cf6" },
  { key: "orphan_employees",      label: "Órfãos Reais",        color: "#f97316" },
];

function TrendBadge({ current, previous }) {
  if (previous == null || current == null) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-gray-400">→ sem mudança</span>;
  const up = diff > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-red-600" : "text-green-600"}`}>
      {up ? "↑" : "↓"} {up ? "+" : ""}{diff}
    </span>
  );
}

export default function HealthTrendBlock({ data }) {
  const [range, setRange] = useState(7);
  const snapshots = data.snapshots || [];

  // Filtrar por período
  const cutoff = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
  const filtered = snapshots
    .filter(s => new Date(s.timestamp) >= cutoff)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const chartData = filtered.map(s => ({
    date: new Date(s.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    health_score:            s.health_score            ?? 0,
    users_without_employee:  s.users_without_employee  ?? 0,
    workshops_without_owner: s.workshops_without_owner ?? 0,
    invites_expired:         s.invites_expired         ?? 0,
    // entidade usa employees_orphaned; fallback para orphan_employees (legado)
    orphan_employees:        s.employees_orphaned ?? s.orphan_employees ?? 0,
  }));

  // Tendência: hoje vs ontem
  const last  = filtered[filtered.length - 1];
  const prev  = filtered[filtered.length - 2];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">📈 Tendência de Saúde</h2>
        <div className="flex gap-1">
          {[7, 30].map(d => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                range === d ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Tendência rápida */}
      {last && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {METRICS.map(m => (
            <div key={m.key} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
              <p className="text-xs text-gray-400 truncate mb-0.5">{m.label}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold text-gray-900">{last[m.key] ?? "–"}</p>
                <TrendBadge current={last?.[m.key]} previous={prev?.[m.key]} />
              </div>
            </div>
          ))}
        </div>
      )}

      {chartData.length < 2 ? (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-xs text-center">
            Histórico insuficiente para exibir gráfico.<br />
            Execute o <code className="text-xs bg-gray-100 px-1 rounded">systemHealthDashboard</code> diariamente para acumular dados.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              labelStyle={{ fontWeight: 600 }}
            />
            {METRICS.map(m => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}