import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const actionTypeLabels = {
  profile_created: "Perfil Criado",
  profile_updated: "Perfil Atualizado",
  profile_deleted: "Perfil Deletado",
  role_created: "Role Criada",
  role_updated: "Role Atualizada",
  role_deleted: "Role Deletada",
  granular_permission_updated: "Permissão Granular Atualizada",
  permission_request_approved: "Solicitação Aprovada",
  permission_request_rejected: "Solicitação Rejeitada",
  user_permission_changed: "Permissão de Usuário Alterada"
};

const targetTypeLabels = {
  profile: "Perfil",
  role: "Role",
  granular_config: "Config. Granular",
  employee: "Colaborador",
  user: "Usuário"
};

const actionTypeColors = {
  profile_created: "bg-green-100 text-green-700",
  profile_updated: "bg-blue-100 text-blue-700",
  profile_deleted: "bg-red-100 text-red-700",
  role_created: "bg-green-100 text-green-700",
  role_updated: "bg-blue-100 text-blue-700",
  role_deleted: "bg-red-100 text-red-700",
  granular_permission_updated: "bg-purple-100 text-purple-700",
  permission_request_approved: "bg-green-100 text-green-700",
  permission_request_rejected: "bg-red-100 text-red-700",
  user_permission_changed: "bg-yellow-100 text-yellow-700"
};

export default function RBACLogTable({ logs, isLoading, onViewDetails }) {
  const [sortField, setSortField] = React.useState('created_date');
  const [sortOrder, setSortOrder] = React.useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedLogs = [...(logs || [])].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'created_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="font-medium">Nenhum log encontrado</p>
        <p className="text-sm mt-1">Logs de auditoria aparecerão aqui conforme ações forem realizadas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th 
              className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('created_date')}
            >
              Data/Hora {sortField === 'created_date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('action_type')}
            >
              Ação {sortField === 'action_type' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('performed_by_name')}
            >
              Usuário {sortField === 'performed_by_name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo Alvo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nome Alvo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Impacto</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedLogs.map((log) => {
            if (!log) return null;
            const hasChanges = log.changes && (log.changes.before || log.changes.after);
            
            return (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {log.created_date ? format(new Date(log.created_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.created_date ? format(new Date(log.created_date), "HH:mm:ss", { locale: ptBR }) : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={actionTypeColors[log.action_type] || "bg-gray-100 text-gray-700"}>
                    {actionTypeLabels[log.action_type] || log.action_type || 'N/A'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium text-gray-900">{log.performed_by_name || 'N/A'}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[150px]" title={log.performed_by}>
                    {log.performed_by || 'N/A'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {targetTypeLabels[log.target_type] || log.target_type || 'N/A'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate" title={log.target_name || log.target_id}>
                  {log.target_name || log.target_id || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {(log.affected_users_count || 0) > 0 ? (
                    <Badge className="bg-orange-100 text-orange-700">
                      {log.affected_users_count} usuários
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant={hasChanges ? "default" : "outline"}
                    size="sm"
                    onClick={() => onViewDetails(log)}
                    className="gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    {hasChanges && <span className="text-xs">Ver Diff</span>}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}