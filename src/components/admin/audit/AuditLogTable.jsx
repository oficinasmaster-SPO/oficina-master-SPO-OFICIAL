import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AuditLogTable({ logs, isLoading }) {
  const getActionBadge = (action) => {
    const badges = {
      login: { variant: "default", label: "Login" },
      logout: { variant: "secondary", label: "Logout" },
      user_approved: { variant: "default", label: "Aprovação", className: "bg-green-100 text-green-800" },
      user_blocked: { variant: "destructive", label: "Bloqueio" },
      user_unblocked: { variant: "default", label: "Desbloqueio", className: "bg-blue-100 text-blue-800" },
      password_reset: { variant: "default", label: "Reset Senha", className: "bg-yellow-100 text-yellow-800" },
      user_created: { variant: "default", label: "Criação", className: "bg-purple-100 text-purple-800" },
      user_updated: { variant: "secondary", label: "Atualização" },
      user_deleted: { variant: "destructive", label: "Exclusão" },
      permission_changed: { variant: "default", label: "Permissão", className: "bg-indigo-100 text-indigo-800" }
    };

    const config = badges[action] || { variant: "secondary", label: action };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum log encontrado com os filtros aplicados
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>IP</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-sm">
                {new Date(log.timestamp).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{log.user_name}</p>
                  <p className="text-xs text-gray-500">{log.user_email}</p>
                </div>
              </TableCell>
              <TableCell>{getActionBadge(log.action)}</TableCell>
              <TableCell>
                {log.entity_type ? (
                  <Badge variant="outline">{log.entity_type}</Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-gray-600">
                {log.ip_address || '-'}
              </TableCell>
              <TableCell className="text-right">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Detalhes do Log</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Ação</p>
                          <p className="font-medium">{log.action}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Data/Hora</p>
                          <p className="font-medium">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Usuário</p>
                          <p className="font-medium">{log.user_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="font-medium">{log.user_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">IP</p>
                          <p className="font-mono text-sm">{log.ip_address || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">User Agent</p>
                          <p className="text-xs truncate">{log.user_agent || '-'}</p>
                        </div>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div>
                          <p className="text-gray-500 text-sm mb-2">Detalhes</p>
                          <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}