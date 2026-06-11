import React from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  SAFE:     { label: "SAFE",     emoji: "✅", bg: "bg-green-50",  border: "border-green-200", text: "text-green-800",  icon: CheckCircle,   iconColor: "text-green-500",  gaugeBg: "#22c55e" },
  WARNING:  { label: "WARNING",  emoji: "⚠️", bg: "bg-yellow-50", border: "border-yellow-200",text: "text-yellow-800", icon: AlertTriangle, iconColor: "text-yellow-500", gaugeBg: "#eab308" },
  CRITICAL: { label: "CRITICAL", emoji: "🚨", bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   icon: XCircle,       iconColor: "text-red-500",    gaugeBg: "#ef4444" },
};

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-100 text-red-800 border border-red-200",
  WARNING:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

const MODULE_STATUS = [
  { key: "governance",      label: "Governança",      icon: "🏛️" },
  { key: "rbac",            label: "RBAC",            icon: "🛡️" },
  { key: "onboarding",      label: "Onboarding",      icon: "🚪" },
  { key: "data_quality",    label: "Qualidade",       icon: "🧹" },
  { key: "recovery",        label: "Recovery",        icon: "🔧" },
  { key: "legacy",          label: "Legacy",          icon: "🔒" },
  { key: "observability",   label: "Observabilidade", icon: "🔭" },
];

function getModuleStatus(key, data) {
  const g  = data.governance || {};
  const obs = data.observability || {};
  const leg = data.legacy || {};

  switch (key) {
    case "governance":
      return (g.workshops_without_owner > 0 || g.duplicate_users > 0 || g.duplicate_employees > 0)
        ? "CRITICAL" : "SAFE";
    case "rbac":
      return g.owners_with_wrong_profile > 0 ? "CRITICAL"
           : (data.profile_mismatches > 0 || data.missing_profiles > 0) ? "WARNING" : "SAFE";
    case "onboarding":
      return (g.invites_pending > 20) ? "WARNING"
           : (g.invites_expired > 0) ? "WARNING" : "SAFE";
    case "data_quality":
      return (g.employees_orphaned > 0 || g.workshops_without_owner > 0) ? "CRITICAL"
           : (g.users_without_employee > 0) ? "WARNING" : "SAFE";
    case "recovery":
      return "SAFE";
    case "legacy":
      return (leg.calls_24h > 0) ? "CRITICAL"
           : (leg.calls_7d > 0) ? "WARNING" : "SAFE";
    case "observability":
      return (obs.failure_rate_7d > 10) ? "WARNING" : "SAFE";
    default:
      return "SAFE";
  }
}

const MODULE_EMOJI = { SAFE: "🟢", WARNING: "🟡", CRITICAL: "🔴" };

function GaugeCircle({ score, color }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
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

  const overallStatus = data.status || "SAFE";

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Status + Gauge */}
        <div className="flex items-center gap-5 flex-shrink-0">
          <GaugeCircle score={data.health_score} color={cfg.gaugeBg} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
              <span className={`text-2xl font-bold ${cfg.text}`}>{cfg.emoji} {data.status}</span>
            </div>
            <p className="text-sm text-gray-600">Health Score: <strong>{data.health_score}/100</strong></p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(data.computed_at).toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Resumo por módulo */}
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status por Módulo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {MODULE_STATUS.map(m => {
              const ms = getModuleStatus(m.key, data);
              return (
                <div key={m.key} className="bg-white/60 rounded-lg p-2 border border-white/80 text-center">
                  <p className="text-lg">{MODULE_EMOJI[ms]}</p>
                  <p className="text-xs text-gray-600 font-medium leading-tight mt-0.5">{m.icon} {m.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas */}
        {data.alerts?.length > 0 && (
          <div className="flex-shrink-0 lg:max-w-xs">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alertas Ativos</p>
            <div className="flex flex-wrap gap-2">
              {data.alerts.map((alert, i) => (
                <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.WARNING}`}>
                  {alert.severity === "CRITICAL" ? "🔴" : "🟡"}
                  {alert.field}: <strong>{alert.value}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
        {(!data.alerts || data.alerts.length === 0) && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              ✅ Nenhum alerta ativo
            </span>
          </div>
        )}
      </div>
    </div>
  );
}