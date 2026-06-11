import React from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  SAFE:     { emoji: "✅", bg: "bg-green-50",  border: "border-green-300",  text: "text-green-800",  icon: CheckCircle,   iconColor: "text-green-500",  gaugeColor: "#22c55e" },
  WARNING:  { emoji: "⚠️", bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", icon: AlertTriangle, iconColor: "text-yellow-500", gaugeColor: "#eab308" },
  CRITICAL: { emoji: "🚨", bg: "bg-red-50",    border: "border-red-300",    text: "text-red-800",   icon: XCircle,       iconColor: "text-red-500",    gaugeColor: "#ef4444" },
};

function GaugeCircle({ score, color }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-bold text-gray-900 leading-none">{score}</p>
        <p className="text-xs text-gray-400">/100</p>
      </div>
    </div>
  );
}

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-100 text-red-800 border border-red-200",
  WARNING:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

export default function HealthStatusCard({ data }) {
  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.SAFE;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex flex-wrap items-center gap-5">

        {/* Gauge + status */}
        <GaugeCircle score={data.health_score} color={cfg.gaugeColor} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            <span className={`text-xl font-bold ${cfg.text}`}>{cfg.emoji} {data.status}</span>
          </div>
          <p className="text-sm text-gray-600">Health Score: <strong>{data.health_score}/100</strong></p>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.computed_at ? new Date(data.computed_at).toLocaleString("pt-BR") : "–"}
          </p>
        </div>

        {/* Alertas */}
        {data.alerts?.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-auto">
            {data.alerts.map((alert, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.WARNING}`}>
                {alert.severity === "CRITICAL" ? "🔴" : "🟡"} {alert.field}: <strong>{alert.value}</strong>
              </span>
            ))}
          </div>
        )}
        {(!data.alerts || data.alerts.length === 0) && (
          <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            ✅ Nenhum alerta ativo
          </span>
        )}
      </div>
    </div>
  );
}