import React from "react";

function KpiCard({ label, value, status = "neutral", suffix = "" }) {
  const styles = {
    critical: value > 0
      ? "bg-red-50 border-red-300 text-red-700"
      : "bg-green-50 border-green-200 text-green-700",
    warning: value > 0
      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
      : "bg-green-50 border-green-200 text-green-700",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
    neutral: "bg-white border-gray-200 text-gray-900",
  };
  const cls = styles[status] || styles.neutral;

  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <p className="text-xs text-gray-500 truncate mb-1">{label}</p>
      <p className="text-2xl font-bold">{value ?? "–"}{suffix}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = {
    CRITICAL: "bg-red-100 text-red-800 border-red-200",
    WARNING:  "bg-yellow-100 text-yellow-800 border-yellow-200",
    SAFE:     "bg-green-100 text-green-800 border-green-200",
  }[status] || "bg-gray-100 text-gray-700 border-gray-200";
  const emoji = { CRITICAL: "🚨", WARNING: "⚠️", SAFE: "✅" }[status] || "–";

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg}`}>
      {emoji} {status}
    </span>
  );
}

export default function IdentityProvisioningBlock({ data }) {
  const prov = data.provisioning || {};

  const {
    users_created_invite    = 0,
    users_created_public    = 0,
    users_pending_workshop  = 0,
    users_without_workshop  = 0,
    users_without_employee  = 0,
    abandoned_signups       = 0,
  } = prov;

  // Derivar status
  let blockStatus = "SAFE";
  if (users_without_workshop > 0 || users_pending_workshop > 0) blockStatus = "CRITICAL";
  else if (abandoned_signups > 0) blockStatus = "WARNING";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">🪪 Provisionamento de Identidade</h2>
        <StatusPill status={blockStatus} />
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Como usuários estão sendo criados · Fluxo D (Signup Órfão) é o caminho mais perigoso
      </p>

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Fluxos de Criação</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Via Convite Admin (Fluxo B)" value={users_created_invite} status="info" />
        <KpiCard label="Via Cadastro Público (Fluxo A)" value={users_created_public} status="info" />
        <KpiCard label="Pending Workshop" value={users_pending_workshop} status="critical" />
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Problemas Ativos</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard label="Users sem Workshop" value={users_without_workshop} status="critical" />
        <KpiCard label="Users sem Employee" value={users_without_employee} status="warning" />
        <KpiCard label="Cadastros Abandonados" value={abandoned_signups} status="warning" />
      </div>

      {blockStatus === "CRITICAL" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          🚨 Fluxo D detectado — usuários sem workshop vinculado precisam de revisão imediata.
        </div>
      )}
      {blockStatus === "WARNING" && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
          ⚠️ Cadastros abandonados detectados — usuários iniciaram o fluxo mas não concluíram.
        </div>
      )}
      {blockStatus === "SAFE" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          ✅ Todos os fluxos de provisionamento estão saudáveis.
        </div>
      )}
    </div>
  );
}