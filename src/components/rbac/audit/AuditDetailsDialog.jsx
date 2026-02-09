import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AuditDetailsDialog({ open, onClose, log }) {
  if (!log) return null;

  const getActionLabel = (action) => {
    const labels = {
      'created': 'Criado',
      'updated': 'Atualizado',
      'profile_changed': 'Perfil Alterado',
      'status_changed': 'Status Alterado',
      'custom_roles_changed': 'Roles Alteradas',
      'permission_change_approved': 'Mudança Aprovada',
      'permission_change_rejected': 'Mudança Rejeitada'
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Auditoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data/Hora</p>
              <p className="font-medium">
                {log.changed_at ? format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ação</p>
              <Badge>{getActionLabel(log.action)}</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Usuário Afetado</p>
            <p className="font-medium">{log.employee_name || 'N/A'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Alterado Por</p>
            <p className="font-medium">{log.changed_by || 'Sistema'}</p>
            {log.changed_by_email && (
              <p className="text-sm text-gray-600">{log.changed_by_email}</p>
            )}
          </div>

          {log.field_changed && (
            <div>
              <p className="text-sm text-gray-500">Campo Alterado</p>
              <p className="font-medium">{log.field_changed}</p>
            </div>
          )}

          {log.old_value && log.new_value && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Mudança</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Valor Anterior:</span>
                  <p className="text-sm text-red-600 line-through">{log.old_value}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Novo Valor:</span>
                  <p className="text-sm text-green-600 font-medium">{log.new_value}</p>
                </div>
              </div>
            </div>
          )}

          {log.affected_users_count && (
            <div>
              <p className="text-sm text-gray-500">Usuários Afetados</p>
              <p className="font-medium">{log.affected_users_count}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}