import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const FUNCTIONS_CONFIG = {
  auditRBACHealth: {
    label: "Audit RBAC Health",
    buttonLabel: "▶ Executar Auditoria",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    cron: "Diário 04:00",
    confirmMessage: "Executar auditRBACHealth agora?\n\nIsso irá varrer todos os profiles e employees em busca de inconsistências RBAC.",
    resultKey: null,
    resultFormatter: (r) => {
      const issues = r?.issues_found ?? r?.total_issues ?? r?.count;
      if (issues != null) return `${issues} problema${issues !== 1 ? "s" : ""} encontrado${issues !== 1 ? "s" : ""}`;
      return "Auditoria concluída";
    },
  },
  cleanupExpiredInvites: {
    label: "Cleanup Expired Invites",
    buttonLabel: "🧹 Limpar Convites Expirados",
    buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-white",
    cron: "Diário 04:05",
    confirmMessage: "Executar cleanupExpiredInvites agora?\n\nIsso irá remover todos os convites expirados do banco.",
    resultFormatter: (r) => {
      const removed = r?.removed ?? r?.deleted ?? r?.count;
      if (removed != null) return `${removed} convite${removed !== 1 ? "s" : ""} removido${removed !== 1 ? "s" : ""}`;
      return "Limpeza concluída";
    },
  },
  cleanupAbandonedWorkshops: {
    label: "Cleanup Abandoned Workshops",
    buttonLabel: "🔧 Executar Recuperação",
    buttonClass: "bg-purple-600 hover:bg-purple-700 text-white",
    cron: "Diário 04:10",
    confirmMessage: "Executar cleanupAbandonedWorkshops agora?\n\nIsso irá recuperar ou desativar workshops abandonados.",
    resultFormatter: (r) => {
      const parts = [];
      if (r?.recovered != null) parts.push(`${r.recovered} workshop${r.recovered !== 1 ? "s" : ""} recuperado${r.recovered !== 1 ? "s" : ""}`);
      if (r?.deactivated != null) parts.push(`${r.deactivated} desativado${r.deactivated !== 1 ? "s" : ""}`);
      if (r?.processed != null && parts.length === 0) parts.push(`${r.processed} processado${r.processed !== 1 ? "s" : ""}`);
      return parts.length > 0 ? parts.join(" · ") : "Execução concluída";
    },
  },
};

function StatusBadge({ status, neverRun }) {
  if (neverRun) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
      ⚠ Nunca executado
    </span>
  );
  if (!status) return <span className="text-xs text-gray-400">–</span>;
  const map = {
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    error:   "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {status.toUpperCase()}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

// Modal de confirmação simples
function ConfirmModal({ fnKey, config, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200">
        <h3 className="text-base font-bold text-gray-900 mb-2">Tem certeza?</h3>
        <p className="text-sm text-gray-600 mb-1">
          Executar <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{fnKey}</code>?
        </p>
        <p className="text-xs text-gray-400 mb-5 whitespace-pre-line">{config.confirmMessage}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${config.buttonClass}`}
          >
            Executar Agora
          </button>
        </div>
      </div>
    </div>
  );
}

// Resultado inline
function ResultBanner({ result }) {
  if (!result) return null;
  const isError = result.status === "error";
  return (
    <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-lg text-xs border ${
      isError
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-green-50 border-green-200 text-green-700"
    }`}>
      {isError
        ? <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        : <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      }
      <div>
        <span className="font-semibold">{isError ? "Erro" : "Sucesso"}</span>
        {" · "}
        <span>{result.message}</span>
        {result.duration_ms != null && (
          <span className="ml-2 text-gray-400">Tempo: {result.duration_ms}ms</span>
        )}
      </div>
    </div>
  );
}

export default function AutomationsBlock({ data, onRefresh }) {
  const automations = data.automations || {};

  // Estado por função: null | "confirming" | "running" | { status, message, duration_ms }
  const [states, setStates] = useState({});
  const [fullCheckState, setFullCheckState] = useState(null); // null | "confirming" | "running" | result

  const setState = (fnKey, val) => setStates(prev => ({ ...prev, [fnKey]: val }));

  const handleFullCheck = async () => {
    setFullCheckState("running");
    const startedAt = Date.now();
    try {
      const res = await base44.functions.invoke("runSystemMaintenance", { action: "runFullCheck" });
      const d = res?.data || {};
      const duration_ms = d.duration_ms ?? (Date.now() - startedAt);
      const issues = d.total_issues ?? 0;
      const msg = issues > 0
        ? `${issues} inconsistência${issues !== 1 ? "s" : ""} encontrada${issues !== 1 ? "s" : ""}`
        : "Nenhuma inconsistência encontrada";
      setFullCheckState({ status: "success", message: msg, duration_ms });
      if (onRefresh) onRefresh();
    } catch (err) {
      const duration_ms = Date.now() - startedAt;
      setFullCheckState({ status: "error", message: err?.response?.data?.error || err?.message || "Erro desconhecido", duration_ms });
    }
  };

  const handleRun = async (fnKey) => {
    const config = FUNCTIONS_CONFIG[fnKey];
    setState(fnKey, "running");
    const startedAt = Date.now();
    try {
      const res = await base44.functions.invoke("runSystemMaintenance", { action: fnKey });
      const payload = res?.data || {};
      const duration_ms = payload.duration_ms ?? (Date.now() - startedAt);
      if (payload.error && !payload.success) {
        setState(fnKey, { status: "error", message: payload.error, duration_ms });
        return;
      }
      const message = config.resultFormatter(payload.result || {});
      setState(fnKey, { status: "success", message, duration_ms });
    } catch (err) {
      const duration_ms = Date.now() - startedAt;
      const errMsg = err?.response?.data?.error || err?.message || "Erro desconhecido";
      setState(fnKey, { status: "error", message: errMsg, duration_ms });
    }
  };

  return (
    <>
      {/* Modais de confirmação */}
      {Object.entries(states).map(([fnKey, state]) =>
        state === "confirming" ? (
          <ConfirmModal
            key={fnKey}
            fnKey={fnKey}
            config={FUNCTIONS_CONFIG[fnKey]}
            onConfirm={() => handleRun(fnKey)}
            onCancel={() => setState(fnKey, null)}
          />
        ) : null
      )}

      {/* Modal confirmação verificação completa */}
      {fullCheckState === "confirming" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Verificação Completa</h3>
            <p className="text-sm text-gray-600 mb-1">Executar verificação completa do sistema?</p>
            <p className="text-xs text-gray-400 mb-5">Irá executar em sequência:<br/>• auditRBACHealth<br/>• auditOrphanEmployees<br/>• auditOrphanUsers</p>
            <div className="flex gap-3">
              <button onClick={() => setFullCheckState(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleFullCheck} className="flex-1 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors">Executar Agora</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-gray-900">⚙️ Automações Monitoradas</h2>
          <button
            onClick={() => setFullCheckState("confirming")}
            disabled={fullCheckState === "running"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {fullCheckState === "running"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...</>
              : <><Play className="w-3 h-3" /> Verificação Completa</>
            }
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Monitore execuções automáticas e dispare manualmente quando necessário
        </p>
        {/* Resultado da verificação completa */}
        <ResultBanner result={typeof fullCheckState === "object" && fullCheckState !== null && fullCheckState !== "running" && fullCheckState !== "confirming" ? fullCheckState : null} />
        {fullCheckState && typeof fullCheckState === "object" && <div className="mb-3" />}

        <div className="space-y-3">
          {Object.entries(FUNCTIONS_CONFIG).map(([fnKey, config]) => {
            const val = automations[fnKey] || {};
            const neverRun = !val.last_run;
            const state = states[fnKey] || null;
            const isRunning = state === "running";
            const result = typeof state === "object" && state !== null ? state : null;
            const formattedDate = formatDate(val.last_run);

            return (
              <div key={fnKey} className={`rounded-lg border p-4 transition-colors ${neverRun ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-white"}`}>
                {/* Linha principal */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Nome + cron */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{config.label}</p>
                      <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">{config.cron}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <StatusBadge status={val.last_status} neverRun={neverRun} />
                      {formattedDate
                        ? <span className="text-xs text-gray-500">Última: {formattedDate}</span>
                        : <span className="text-xs text-gray-400 italic">⚠ Primeira execução pendente</span>
                      }
                      {val.last_duration_ms != null && (
                        <span className="text-xs text-gray-400">{val.last_duration_ms}ms</span>
                      )}
                      {val.last_processed != null && (
                        <span className="text-xs text-gray-400">{val.last_processed} processados</span>
                      )}
                      {val.errors_7d > 0 && (
                        <span className="text-xs text-red-600 font-medium">{val.errors_7d} erro{val.errors_7d > 1 ? "s" : ""} (7d)</span>
                      )}
                    </div>
                  </div>

                  {/* Botão de ação */}
                  <button
                    onClick={() => setState(fnKey, "confirming")}
                    disabled={isRunning}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 flex-shrink-0 ${config.buttonClass}`}
                  >
                    {isRunning
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Executando...</>
                      : <><Play className="w-3 h-3" /> {config.buttonLabel}</>
                    }
                  </button>
                </div>

                {/* Resultado inline */}
                <ResultBanner result={result} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}