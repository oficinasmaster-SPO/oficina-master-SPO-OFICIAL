import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import IssueDetailDrawer from "./IssueDetailDrawer";
import IssueConfirmModal from "./IssueConfirmModal";

// ─── Configuração rica de cada tipo de problema ───────────────────────────────

const ISSUE_REGISTRY = {
  duplicate_employees: {
    label: "Duplicate Employees",
    severity: "CRITICAL",
    icon: "👥",
    impact: [
      "Permissões inconsistentes no RBAC",
      "Relatórios de pessoas duplicados",
      "Falhas de auditoria",
      "Vínculos de Workshop incorretos",
    ],
    detected_by: "auditRBACHealth",
    audit_action: "auditRBACHealth",
    fix_action: "cleanupOrphanEmployees",
    detail_key: "duplicate_employees_detail",
    has_details: true,
    has_fix: true,
  },
  duplicate_users: {
    label: "Duplicate Users",
    severity: "CRITICAL",
    icon: "👤",
    impact: [
      "Login duplicado possível",
      "Permissões conflitantes",
      "Dados de sessão inconsistentes",
      "Falhas de autenticação",
    ],
    detected_by: "auditRBACHealth",
    audit_action: "auditRBACHealth",
    fix_action: null,
    detail_key: "duplicate_users_detail",
    has_details: true,
    has_fix: false,
  },
  workshops_without_owner: {
    label: "Workshops sem Owner",
    severity: "CRITICAL",
    icon: "🏪",
    impact: [
      "Nenhum administrador responsável",
      "Dados órfãos sem gestão",
      "Acesso impossível para a oficina",
      "Quebra de hierarquia de permissões",
    ],
    detected_by: "auditRBACHealth",
    audit_action: "auditRBACHealth",
    fix_action: "fixOrphanedWorkshopAdmins",
    detail_key: "workshops_without_owner_detail",
    has_details: true,
    has_fix: true,
  },
  owners_with_wrong_profile: {
    label: "Owners com Perfil Incorreto",
    severity: "HIGH",
    icon: "🔐",
    impact: [
      "Owner sem permissões adequadas",
      "Acesso bloqueado indevidamente",
      "Perfil de Sócio não atribuído",
    ],
    detected_by: "auditRBACHealth",
    audit_action: "auditRBACHealth",
    fix_action: "fixRBACProfiles",
    detail_key: "owners_wrong_profile_detail",
    has_details: true,
    has_fix: true,
  },
  employees_orphaned: {
    label: "Orphan Employees",
    severity: "HIGH",
    icon: "🔗",
    impact: [
      "Employee sem User vinculado",
      "Impossível fazer login",
      "Dados de pessoa sem acesso",
    ],
    detected_by: "auditOrphanEmployees",
    audit_action: "auditOrphanEmployees",
    fix_action: "repairOrphanEmployees",
    detail_key: "orphan_employees_detail",
    has_details: true,
    has_fix: true,
  },
  orphan_users: {
    label: "Orphan Users",
    severity: "MEDIUM",
    icon: "👻",
    impact: [
      "User sem Employee vinculado",
      "Acesso sem perfil definido",
      "Dados de uso sem rastreabilidade",
    ],
    detected_by: "auditOrphanUsers",
    audit_action: "auditOrphanUsers",
    fix_action: null,
    detail_key: "orphan_users_detail",
    has_details: true,
    has_fix: false,
  },
  legacy_calls: {
    label: "Legacy Endpoint Calls",
    severity: "MEDIUM",
    icon: "⚠️",
    impact: [
      "Endpoints descontinuados ainda em uso",
      "Risco de quebra em atualizações",
      "Código legado ativo em produção",
    ],
    detected_by: "checkLegacyWorkshopIdGuard",
    audit_action: null,
    fix_action: null,
    detail_key: "legacy_calls_detail",
    has_details: true,
    has_fix: false,
  },
};

const SEVERITY_CONFIG = {
  CRITICAL: { label: "Crítico", color: "text-red-700", bg: "bg-red-100", border: "border-red-300", dot: "bg-red-500" },
  HIGH:     { label: "Alto",    color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-300", dot: "bg-orange-500" },
  MEDIUM:   { label: "Médio",   color: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-300", dot: "bg-yellow-500" },
  LOW:      { label: "Baixo",   color: "text-blue-700",  bg: "bg-blue-100", border: "border-blue-300", dot: "bg-blue-500" },
};

// ─── Sub-componente: card de problema individual ──────────────────────────────

function IssueCard({ issue, cfg, sev, onViewDetails, onAudit, onFix, isAuditing, isFixing }) {
  return (
    <div className={`rounded-xl border-2 ${sev.border} bg-white shadow-sm flex flex-col gap-0 overflow-hidden`}>
      {/* Header */}
      <div className={`${sev.bg} px-4 py-3 flex items-start justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{cfg.icon}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{cfg.label}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
              <span className={`text-xs font-medium ${sev.color}`}>{sev.label}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-2xl font-bold ${sev.color}`}>{issue.value}</p>
          <p className="text-xs text-gray-500">registros</p>
        </div>
      </div>

      {/* Impact */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Impacto</p>
        <ul className="space-y-0.5">
          {cfg.impact.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
              <span className="text-gray-400 flex-shrink-0 mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Detected by */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400">
          Detectado por: <span className="font-mono text-gray-600 text-[11px]">{cfg.detected_by}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2">
        {cfg.has_details && (
          <button
            onClick={() => onViewDetails(issue.key, cfg)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            🔍 Ver Detalhes
          </button>
        )}
        {cfg.audit_action && (
          <button
            onClick={() => onAudit(issue.key, cfg)}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors disabled:opacity-50"
          >
            {isAuditing ? "⏳ Auditando..." : "📋 Executar Auditoria"}
          </button>
        )}
        {cfg.has_fix && cfg.fix_action && (
          <button
            onClick={() => onFix(issue.key, cfg)}
            disabled={isFixing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors disabled:opacity-50"
          >
            {isFixing ? "⏳ Corrigindo..." : "🔧 Corrigir Automaticamente"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CriticalIssuesBlock({ data, onActionExecuted }) {
  const g = data.governance || {};
  const leg = data.legacy || {};

  const [detailDrawer, setDetailDrawer] = useState(null); // { key, cfg, details }
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { key, cfg, mode }
  const [actionLoading, setActionLoading] = useState({}); // { [key_mode]: bool }
  const [actionResult, setActionResult] = useState({}); // { [key]: result }

  const issues = [
    { key: "duplicate_employees",       value: g.duplicate_employees       ?? 0 },
    { key: "duplicate_users",           value: g.duplicate_users           ?? 0 },
    { key: "workshops_without_owner",   value: g.workshops_without_owner   ?? 0 },
    { key: "owners_with_wrong_profile", value: g.owners_with_wrong_profile ?? 0 },
    { key: "employees_orphaned",        value: g.employees_orphaned        ?? 0 },
    { key: "orphan_users",              value: g.orphan_users              ?? 0 },
    { key: "legacy_calls",              value: leg.calls_24h               ?? 0 },
  ].filter(i => i.value > 0);

  const criticalCount = issues.filter(i => ISSUE_REGISTRY[i.key]?.severity === "CRITICAL").length;
  const highCount     = issues.filter(i => ISSUE_REGISTRY[i.key]?.severity === "HIGH").length;
  const mediumCount   = issues.filter(i => ISSUE_REGISTRY[i.key]?.severity === "MEDIUM").length;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleViewDetails = async (key, cfg) => {
    setLoadingDetails(true);
    setDetailDrawer({ key, cfg, details: null, loading: true });
    try {
      const res = await base44.functions.invoke("runSystemMaintenance", {
        action: cfg.audit_action || "auditRBACHealth",
        include_details: true,
        detail_key: key,
      });
      setDetailDrawer({ key, cfg, details: res?.data?.result || res?.data || null, loading: false });
    } catch (e) {
      setDetailDrawer({ key, cfg, details: null, loading: false, error: e?.message });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAudit = (key, cfg) => {
    setConfirmModal({ key, cfg, mode: "audit" });
  };

  const handleFix = (key, cfg) => {
    setConfirmModal({ key, cfg, mode: "fix" });
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    const { key, cfg, mode } = confirmModal;
    const loadKey = `${key}_${mode}`;
    const action = mode === "fix" ? cfg.fix_action : cfg.audit_action;

    setActionLoading(prev => ({ ...prev, [loadKey]: true }));
    setConfirmModal(null);

    try {
      const res = await base44.functions.invoke("runSystemMaintenance", { action });
      const result = res?.data?.result || res?.data || {};
      setActionResult(prev => ({ ...prev, [key]: { mode, result, success: res?.data?.success !== false, ts: new Date() } }));
      if (onActionExecuted) onActionExecuted();
    } catch (e) {
      setActionResult(prev => ({ ...prev, [key]: { mode, error: e?.message, success: false, ts: new Date() } }));
    } finally {
      setActionLoading(prev => ({ ...prev, [loadKey]: false }));
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className={`rounded-xl border-2 p-5 ${issues.length > 0 ? "bg-red-50 border-red-300" : "bg-green-50 border-green-200"}`}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-lg">{issues.length > 0 ? "🚨" : "✅"}</span>
          <h2 className="text-base font-semibold text-gray-900">Problemas Críticos</h2>

          {issues.length > 0 && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-bold">{criticalCount} crítico{criticalCount > 1 ? "s" : ""}</span>
              )}
              {highCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 text-xs font-bold">{highCount} alto{highCount > 1 ? "s" : ""}</span>
              )}
              {mediumCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">{mediumCount} médio{mediumCount > 1 ? "s" : ""}</span>
              )}
            </div>
          )}
        </div>

        {issues.length === 0 ? (
          <p className="text-sm text-green-700 font-medium">✅ Nenhum problema crítico encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {issues.map(issue => {
              const cfg = ISSUE_REGISTRY[issue.key];
              if (!cfg) return null;
              const sev = SEVERITY_CONFIG[cfg.severity] || SEVERITY_CONFIG.MEDIUM;
              const loadAudit = actionLoading[`${issue.key}_audit`];
              const loadFix   = actionLoading[`${issue.key}_fix`];
              const result    = actionResult[issue.key];

              return (
                <div key={issue.key} className="flex flex-col gap-0">
                  <IssueCard
                    issue={issue}
                    cfg={cfg}
                    sev={sev}
                    onViewDetails={handleViewDetails}
                    onAudit={handleAudit}
                    onFix={handleFix}
                    isAuditing={!!loadAudit}
                    isFixing={!!loadFix}
                  />
                  {/* Resultado inline */}
                  {result && (
                    <div className={`mt-1 px-3 py-2 rounded-lg text-xs ${result.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                      {result.success ? "✅" : "❌"} {result.mode === "fix" ? "Correção" : "Auditoria"} executada às {result.ts?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {result.error && <span className="ml-1">— {result.error}</span>}
                      {result.result && (
                        <span className="ml-1 font-mono">
                          {result.result.removed != null && ` · ${result.result.removed} removidos`}
                          {result.result.orphans != null && ` · ${result.result.orphans} órfãos`}
                          {result.result.duration_ms != null && ` · ${(result.result.duration_ms / 1000).toFixed(1)}s`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer de detalhes */}
      {detailDrawer && (
        <IssueDetailDrawer
          issueKey={detailDrawer.key}
          cfg={detailDrawer.cfg}
          details={detailDrawer.details}
          loading={detailDrawer.loading}
          error={detailDrawer.error}
          data={data}
          onClose={() => setDetailDrawer(null)}
        />
      )}

      {/* Modal de confirmação */}
      {confirmModal && (
        <IssueConfirmModal
          issueKey={confirmModal.key}
          cfg={confirmModal.cfg}
          mode={confirmModal.mode}
          count={issues.find(i => i.key === confirmModal.key)?.value ?? 0}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}