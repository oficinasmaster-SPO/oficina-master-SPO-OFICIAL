import React, { useState } from "react";

const SEALED_ENDPOINTS = [
  "createEmployeeUser",
  "registerEmployeeComplete",
  "createUserForEmployee",
];

function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
    </div>
  );
}

function formatTs(ts) {
  if (!ts) return "–";
  try { return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return ts; }
}

export default function LegacyBlock({ data }) {
  const legacy = data.legacy || {};
  const [expanded, setExpanded] = useState(false);

  const calls_24h = legacy.calls_24h ?? 0;
  const calls_7d  = legacy.calls_7d  ?? 0;
  const calls_30d = legacy.calls_30d ?? 0;
  const lastCall  = legacy.last_call || null;
  const recentCalls = legacy.recent_calls || [];

  const isCritical = calls_24h > 0;
  const isWarning  = !isCritical && calls_7d > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">🔒 Endpoints Legados Selados</h2>
        {isCritical && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-red-50 border-red-200 text-red-700">
            🚨 CRITICAL
          </span>
        )}
        {isWarning && !isCritical && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-yellow-50 border-yellow-200 text-yellow-700">
            ⚠️ WARNING
          </span>
        )}
        {!isCritical && !isWarning && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-green-50 border-green-200 text-green-700">
            ✅ SAFE
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">Qualquer chamada indica uso de fluxo desatualizado</p>

      {/* Endpoints selados */}
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Endpoints Selados</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SEALED_ENDPOINTS.map(ep => (
          <span key={ep} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-mono border border-gray-200">
            🔒 {ep}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard label="Endpoints Selados" value={SEALED_ENDPOINTS.length} color="text-gray-600" />
        <StatCard label="Chamadas 24h" value={calls_24h} color={calls_24h > 0 ? "text-red-600"    : "text-green-600"} />
        <StatCard label="Chamadas 7d"  value={calls_7d}  color={calls_7d  > 0 ? "text-orange-600" : "text-green-600"} />
        <StatCard label="Chamadas 30d" value={calls_30d} color={calls_30d > 0 ? "text-orange-600" : "text-green-600"} />
      </div>

      {/* Última chamada */}
      {lastCall && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-700 mb-1">Última chamada detectada</p>
          <div className="grid grid-cols-2 gap-1 text-gray-600">
            <span>Endpoint: <strong>{lastCall.endpoint || "–"}</strong></span>
            <span>Quando: <strong>{formatTs(lastCall.timestamp)}</strong></span>
            {lastCall.caller_email && <span className="col-span-2">Caller: <strong>{lastCall.caller_email}</strong></span>}
          </div>
        </div>
      )}

      {/* Chamadas recentes expandíveis */}
      {recentCalls.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? "▼ Ocultar" : "▶ Ver"} chamadas recentes ({recentCalls.length})
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {recentCalls.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-red-50 border border-red-100 rounded px-3 py-1.5">
                  <span className="font-mono text-red-700">{c.endpoint || c.details?.function_name || "?"}</span>
                  <span className="text-gray-500">{c.details?.caller_email || "–"}</span>
                  <span className="text-gray-400">{formatTs(c.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status final */}
      {isCritical && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          🚨 Chamadas legacy detectadas nas últimas 24h — investigar fluxo imediatamente.
        </div>
      )}
      {!isCritical && calls_7d === 0 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          ✅ Nenhuma chamada legacy detectada nos últimos 7 dias.
        </div>
      )}
    </div>
  );
}