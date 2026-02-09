import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, FileText } from "lucide-react";
import { format } from "date-fns";

export default function AuditHistoryViewer({ auditLog = [] }) {
  if (!auditLog || auditLog.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma alteração registrada</p>
        </CardContent>
      </Card>
    );
  }

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

  const getActionColor = (action) => {
    if (action.includes('approved')) return 'bg-green-100 text-green-800';
    if (action.includes('rejected')) return 'bg-red-100 text-red-800';
    if (action.includes('changed')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {auditLog.map((entry, index) => (
              <div key={index} className="border-l-2 border-gray-300 pl-4 pb-4 relative">
                <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-[7px] top-1" />
                
                <div className="flex items-start justify-between mb-2">
                  <Badge className={getActionColor(entry.action)}>
                    {getActionLabel(entry.action)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {entry.changed_at ? format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm') : '-'}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-3 h-3" />
                    <span>{entry.changed_by || 'Sistema'}</span>
                    {entry.changed_by_email && (
                      <span className="text-xs text-gray-400">({entry.changed_by_email})</span>
                    )}
                  </div>

                  {entry.field_changed && (
                    <div className="mt-2">
                      <span className="font-medium text-gray-700">Campo: </span>
                      <span className="text-gray-600">{entry.field_changed}</span>
                    </div>
                  )}

                  {entry.old_value && entry.new_value && (
                    <div className="mt-2 bg-gray-50 rounded-md p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 line-through">{entry.old_value}</span>
                        <span>→</span>
                        <span className="text-green-600 font-medium">{entry.new_value}</span>
                      </div>
                    </div>
                  )}

                  {entry.affected_users_count && (
                    <div className="mt-1 text-xs text-gray-500">
                      {entry.affected_users_count} usuário(s) afetado(s)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}