import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogTable({ logs = [], onViewDetails }) {
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
    if (action.includes('approved')) return 'default';
    if (action.includes('rejected')) return 'destructive';
    if (action.includes('changed')) return 'outline';
    return 'secondary';
  };

  if (logs.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        Nenhum log de auditoria encontrado
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Campo</TableHead>
            <TableHead>Alterado Por</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log, index) => (
            <TableRow key={index}>
              <TableCell className="text-sm">
                {log.changed_at ? format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm') : '-'}
              </TableCell>
              <TableCell className="font-medium">{log.employee_name || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={getActionColor(log.action)}>
                  {getActionLabel(log.action)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {log.field_changed || '-'}
              </TableCell>
              <TableCell className="text-sm">
                {log.changed_by || 'Sistema'}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onViewDetails(log)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}