import React from "react";
import { AlertTriangle, Wrench, ClipboardList } from "lucide-react";

export default function IssueConfirmModal({ issueKey, cfg, mode, count, onConfirm, onCancel }) {
  const isFix = mode === "fix";
  const action = isFix ? cfg.fix_action : cfg.audit_action;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-5 flex items-center gap-3 ${isFix ? "bg-amber-50 border-b border-amber-100" : "bg-blue-50 border-b border-blue-100"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isFix ? "bg-amber-100" : "bg-blue-100"}`}>
              {isFix
                ? <Wrench className="w-5 h-5 text-amber-600" />
                : <ClipboardList className="w-5 h-5 text-blue-600" />
              }
            </div>
            <div>
              <h3 className={`font-bold ${isFix ? "text-amber-800" : "text-blue-800"}`}>
                {isFix ? "Confirmar Correção Automática" : "Confirmar Auditoria"}
              </h3>
              <p className="text-xs text-gray-500">{cfg.label}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">
                  {count} registro{count !== 1 ? "s" : ""} {isFix ? "serão analisados para correção" : "serão auditados"}
                </p>
                {isFix && (
                  <p className="text-xs text-gray-500">
                    Esta operação pode alterar vínculos e permissões. Registros que não puderem ser corrigidos automaticamente serão marcados para análise manual.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">Função que será executada:</p>
              <p className="font-mono text-xs text-gray-700">{action}</p>
            </div>

            <p className="text-sm text-gray-600">
              Tem certeza que deseja {isFix ? "executar a correção automática" : "executar a auditoria"} para <strong>{cfg.label}</strong>?
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isFix ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isFix ? "🔧 Corrigir Automaticamente" : "📋 Executar Auditoria"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}