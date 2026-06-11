import React from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  SAFE:     { label: "SAFE",     emoji: "✅", bg: "bg-green-50",  border: "border-green-200", text: "text-green-800",  icon: CheckCircle,     iconColor: "text-green-500",  gaugeBg: "#22c55e" },
  WARNING:  { label: "WARNING",  emoji: "⚠️", bg: "bg-yellow-50", border: "border-yellow-200",text: "text-yellow-800", icon: AlertTriangle,   iconColor: "text-yellow-500", gaugeBg: "#eab308" },
  CRITICAL: { label: "CRITICAL", emoji: "🚨", bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   icon: XCircle,         iconColor: "text-red-500",    gaugeBg: "#ef4444" },
};

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-100 text-red-800 border border-red-200",
  WARNING:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

function GaugeCircle({ score, color }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900">{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  );
}

export default function HealthStatusCard({ data }) {
  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.SAFE;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Status + Gauge */}
        <div className="flex items-center gap-5">
          <GaugeCircle score={data.health_score} color={cfg.gaugeBg} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
              <span className={`text-2xl font-bold ${cfg.text}`}>
                {cfg.emoji} {data.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Health Score: <strong>{data.health_score}/100</strong>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(data.computed_at).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {data.alerts?.length > 0 && (
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alertas Ativos</p>
            <div className="flex flex-wrap gap-2">
              {data.alerts.map((alert, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.WARNING}`}
                >
                  {alert.severity === "CRITICAL" ? "🔴" : "🟡"}
                  {alert.field}: <strong>{alert.value}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
        {(!data.alerts || data.alerts.length === 0) && (
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              ✅ Nenhum alerta ativo
            </span>
          </div>
        )}
      </div>
    </div>
  );
}