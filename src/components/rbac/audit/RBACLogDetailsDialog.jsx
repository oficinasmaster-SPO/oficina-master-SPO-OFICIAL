import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RBACLogDetailsDialog({ log, open, onClose }) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Data/Hora</p>
              <p className="text-sm">{format(new Date(log.created_date), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Tipo de Ação</p>
              <Badge className="mt-1">{log.action_type}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Realizado Por</p>
              <p className="text-sm font-medium">{log.performed_by_name}</p>
              <p className="text-xs text-gray-500">{log.performed_by}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Recurso Afetado</p>
              <p className="text-sm">{log.target_type}: {log.target_name || log.target_id}</p>
            </div>
          </div>

          {log.affected_users_count > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Usuários Impactados</p>
              <p className="text-sm">{log.affected_users_count} usuário(s)</p>
            </div>
          )}

          {log.changes && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Alterações Realizadas</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-red-700 mb-2">Antes</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                    {JSON.stringify(log.changes.before, null, 2)}
                  </pre>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-green-700 mb-2">Depois</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                    {JSON.stringify(log.changes.after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {log.ip_address && (
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-semibold">IP:</span> {log.ip_address}
              </div>
              {log.user_agent && (
                <div>
                  <span className="font-semibold">Navegador:</span> {log.user_agent.substring(0, 50)}...
                </div>
              )}
            </div>
          )}

          {log.notes && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Observações</p>
              <p className="text-sm text-gray-700">{log.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}