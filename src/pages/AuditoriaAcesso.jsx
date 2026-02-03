import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Search,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
  Clock,
  Eye
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RevokePermissionsDialog from "@/components/rbac/RevokePermissionsDialog";

export default function AuditoriaAcesso() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7d");
  const [selectedLog, setSelectedLog] = useState(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  // Verificar acesso interno
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: employee } = useQuery({
    queryKey: ['current-employee', currentUser?.id],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      return employees?.[0];
    },
    enabled: !!currentUser?.id
  });

  const isInternal = currentUser?.role === 'admin' || 
                     currentUser?.is_internal === true ||
                     employee?.is_internal === true ||
                     employee?.tipo_vinculo === 'interno';

  // Buscar logs de acesso
  const { data: accessLogs = [], isLoading } = useQuery({
    queryKey: ['access-logs', dateFilter],
    queryFn: async () => {
      const logs = await base44.entities.UserActivityLog.list();
      
      // Filtrar por data
      const now = new Date();
      let cutoffDate = new Date();
      
      switch(dateFilter) {
        case '1d': cutoffDate.setDate(now.getDate() - 1); break;
        case '7d': cutoffDate.setDate(now.getDate() - 7); break;
        case '30d': cutoffDate.setDate(now.getDate() - 30); break;
        case '90d': cutoffDate.setDate(now.getDate() - 90); break;
        default: cutoffDate = null;
      }
      
      if (cutoffDate) {
        return logs.filter(log => new Date(log.created_date) >= cutoffDate);
      }
      
      return logs;
    },
    enabled: isInternal
  });

  // Buscar estatísticas
  const stats = React.useMemo(() => {
    const total = accessLogs.length;
    const granted = accessLogs.filter(log => log.access_granted).length;
    const denied = accessLogs.filter(log => !log.access_granted).length;
    const uniqueUsers = [...new Set(accessLogs.map(log => log.user_email))].length;
    
    return { total, granted, denied, uniqueUsers };
  }, [accessLogs]);

  // Filtrar logs
  const filteredLogs = React.useMemo(() => {
    return accessLogs.filter(log => {
      const matchesSearch = searchTerm === "" || 
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.page_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "granted" && log.access_granted) ||
        (statusFilter === "denied" && !log.access_granted);
      
      return matchesSearch && matchesStatus;
    });
  }, [accessLogs, searchTerm, statusFilter]);

  // Exportar CSV
  const handleExport = () => {
    const csv = [
      ['Data/Hora', 'Usuário', 'Email', 'Página', 'Status', 'Motivo', 'IP'],
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        log.user_name || '-',
        log.user_email || '-',
        log.page_name || '-',
        log.access_granted ? 'Permitido' : 'Negado',
        log.denial_reason || '-',
        log.ip_address || '-'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_acesso_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  // Revogar permissões
  const handleRevokePermissions = (log) => {
    setSelectedUser({
      id: log.user_id,
      email: log.user_email,
      name: log.user_name
    });
    setShowRevokeDialog(true);
  };

  if (!isInternal) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base">
            <strong>Acesso Restrito:</strong> Esta área é exclusiva para usuários internos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Auditoria de Acesso</h1>
          <p className="text-gray-600 mt-1">
            Monitoramento de tentativas de acesso a páginas restritas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Acessos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Permitidos</p>
                <p className="text-2xl font-bold text-green-600">{stats.granted}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Negados</p>
                <p className="text-2xl font-bold text-red-600">{stats.denied}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuários Únicos</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.uniqueUsers}</p>
              </div>
              <User className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por usuário, email ou página..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="granted">Permitidos</SelectItem>
                <SelectItem value="denied">Negados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todos os registros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs de Acesso ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Data/Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Usuário</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Página</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.user_name || 'Usuário Desconhecido'}
                          </p>
                          <p className="text-xs text-gray-500">{log.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700">{log.page_name}</p>
                      </td>
                      <td className="py-3 px-4">
                        {log.access_granted ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Permitido
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              <XCircle className="w-3 h-3 mr-1" />
                              Negado
                            </Badge>
                            {log.denial_reason && (
                              <p className="text-xs text-gray-500">{log.denial_reason}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Detalhes
                          </Button>
                          {!log.access_granted && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokePermissions(log)}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Ajustar Permissões
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Log de Acesso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Usuário</p>
                  <p className="text-sm text-gray-900">{selectedLog.user_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-900">{selectedLog.user_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Página</p>
                  <p className="text-sm text-gray-900">{selectedLog.page_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Data/Hora</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedLog.created_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <Badge className={selectedLog.access_granted ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selectedLog.access_granted ? 'Permitido' : 'Negado'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">IP Address</p>
                  <p className="text-sm text-gray-900">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>
              {selectedLog.denial_reason && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Motivo da Negação</p>
                  <p className="text-sm text-gray-900">{selectedLog.denial_reason}</p>
                </div>
              )}
              {selectedLog.metadata && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Metadados</p>
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke Permissions Dialog */}
      {showRevokeDialog && selectedUser && (
        <RevokePermissionsDialog
          open={showRevokeDialog}
          onClose={() => {
            setShowRevokeDialog(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          userName={selectedUser.name}
        />
      )}
    </div>
  );
}