import React, { useMemo } from "react";
import { X } from "lucide-react";

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function classifyDuplicateEmployee(group) {
  // Mesmo user_id vinculado a múltiplos workshops → CRITICAL
  if (group.workshops?.length > 1) return "CRITICAL";
  // Múltiplos owner em workshops diferentes → CRITICAL
  if (group.is_owner_conflict) return "CRITICAL";
  // Duplicata simples, sem impacto RBAC → MEDIUM
  return "MEDIUM";
}

function SeverityBadge({ sev }) {
  const map = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH:     "bg-orange-100 text-orange-700",
    MEDIUM:   "bg-yellow-100 text-yellow-700",
    LOW:      "bg-blue-100 text-blue-700",
  };
  const labels = { CRITICAL: "Crítico", HIGH: "Alto", MEDIUM: "Médio", LOW: "Baixo" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[sev] || map.MEDIUM}`}>
      {labels[sev] || sev}
    </span>
  );
}

// ─── Renderizadores específicos por tipo ──────────────────────────────────────

function DuplicateEmployeesTable({ details, data }) {
  const employees = data?.governance?.duplicate_employees_list || [];

  // Agrupa por user_id
  const grouped = useMemo(() => {
    const map = new Map();
    for (const emp of employees) {
      const key = emp.user_id || emp.email || emp.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(emp);
    }
    return [...map.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({
        key,
        list,
        severity: classifyDuplicateEmployee({ workshops: [...new Set(list.map(e => e.workshop_id))], is_owner_conflict: list.filter(e => e.is_partner || e.job_role === "socio").length > 1 }),
      }))
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [employees]);

  if (employees.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic p-4">
        Dados detalhados não disponíveis. Execute a auditoria para obter a lista completa.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Severity summary */}
      <div className="flex gap-2 flex-wrap">
        {["CRITICAL", "HIGH", "MEDIUM"].map(s => {
          const count = grouped.filter(g => g.severity === s).length;
          return count > 0 ? <SeverityBadge key={s} sev={s} /> : null;
        })}
        <span className="text-xs text-gray-500 self-center">{grouped.length} grupos de duplicatas</span>
      </div>

      {grouped.map(({ key, list, severity }) => (
        <div key={key} className={`border rounded-lg overflow-hidden ${severity === "CRITICAL" ? "border-red-300" : severity === "HIGH" ? "border-orange-300" : "border-yellow-200"}`}>
          <div className={`flex items-center justify-between px-3 py-2 ${severity === "CRITICAL" ? "bg-red-50" : severity === "HIGH" ? "bg-orange-50" : "bg-yellow-50"}`}>
            <span className="font-mono text-xs text-gray-700 truncate">{key}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">{list.length}x</span>
              <SeverityBadge sev={severity} />
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Employee ID</th>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Workshop</th>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Owner</th>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Criação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((emp, i) => (
                <tr key={i} className="bg-white hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-600 truncate max-w-[120px]">{emp.id?.slice(-8) || "—"}</td>
                  <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]">{emp.workshop_name || emp.workshop_id?.slice(-8) || "—"}</td>
                  <td className="px-3 py-2">{emp.is_partner || emp.job_role === "socio" ? <span className="text-orange-600 font-semibold">Sócio</span> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.created_date ? new Date(emp.created_date).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function OrphanEmployeesTable({ details, data }) {
  const list = details?.orphan_list || data?.governance?.orphan_employees_list || [];

  if (list.length === 0) {
    return <p className="text-sm text-gray-500 italic p-4">Dados detalhados não disponíveis. Execute a auditoria para obter a lista.</p>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Nome</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Email</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Workshop</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">User ID</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Criação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {list.map((emp, i) => (
          <tr key={i} className="bg-white hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800">{emp.full_name || "—"}</td>
            <td className="px-3 py-2 text-gray-600 truncate max-w-[160px]">{emp.email || "—"}</td>
            <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">{emp.workshop_name || emp.workshop_id?.slice(-8) || "—"}</td>
            <td className="px-3 py-2 font-mono text-[10px] text-orange-600">{emp.user_id ? emp.user_id.slice(-8) + " ❌" : "sem user"}</td>
            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.created_date ? new Date(emp.created_date).toLocaleDateString("pt-BR") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WorkshopsWithoutOwnerTable({ details, data }) {
  const list = details?.workshops_list || data?.governance?.workshops_without_owner_list || [];

  if (list.length === 0) {
    return <p className="text-sm text-gray-500 italic p-4">Dados detalhados não disponíveis. Execute a auditoria para obter a lista.</p>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Nome da Oficina</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Cidade/Estado</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Owner ID</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
          <th className="text-left px-3 py-2 font-medium text-gray-500">Criação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {list.map((ws, i) => (
          <tr key={i} className="bg-white hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-800">{ws.name || "—"}</td>
            <td className="px-3 py-2 text-gray-600">{[ws.city, ws.state].filter(Boolean).join(", ") || "—"}</td>
            <td className="px-3 py-2 font-mono text-[10px] text-red-600">{ws.owner_id ? ws.owner_id.slice(-8) + " (inválido)" : "sem owner"}</td>
            <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ws.status === "ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{ws.status || "—"}</span></td>
            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{ws.created_date ? new Date(ws.created_date).toLocaleDateString("pt-BR") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GenericDetailTable({ details, data, issueKey }) {
  // Fallback genérico que exibe os dados retornados pela auditoria
  const raw = details || {};
  const entries = Object.entries(raw).filter(([k]) => !["timestamp", "issues_found"].includes(k));

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 italic p-4">Execute a auditoria para ver detalhes específicos.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
          <span className="text-xs font-mono text-gray-500">{k}</span>
          <span className="text-sm font-semibold text-gray-800">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

const DETAIL_RENDERERS = {
  duplicate_employees:       DuplicateEmployeesTable,
  employees_orphaned:        OrphanEmployeesTable,
  workshops_without_owner:   WorkshopsWithoutOwnerTable,
};

// ─── Drawer principal ─────────────────────────────────────────────────────────

export default function IssueDetailDrawer({ issueKey, cfg, details, loading, error, data, onClose }) {
  const Renderer = DETAIL_RENDERERS[issueKey] || GenericDetailTable;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cfg.icon}</span>
            <div>
              <h2 className="font-bold text-gray-900">{cfg.label}</h2>
              <p className="text-xs text-gray-500">Detectado por: <span className="font-mono">{cfg.detected_by}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Impacto */}
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex-shrink-0">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Impacto</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
            {cfg.impact.map((item, i) => (
              <li key={i} className="text-xs text-red-700 flex items-center gap-1">
                <span>•</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Carregando detalhes...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              ❌ Erro ao carregar detalhes: {error}
            </div>
          ) : (
            <Renderer details={details} data={data} issueKey={issueKey} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}