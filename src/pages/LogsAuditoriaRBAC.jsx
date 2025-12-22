import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Download } from "lucide-react";
import RBACLogTable from "@/components/rbac/audit/RBACLogTable";
import RBACLogFilters from "@/components/rbac/audit/RBACLogFilters";
import RBACLogStats from "@/components/rbac/audit/RBACLogStats";
import RBACLogDetailsDialog from "@/components/rbac/audit/RBACLogDetailsDialog";

export default function LogsAuditoriaRBAC() {
  const [filters, setFilters] = useState({
    actionType: "all",
    targetType: "all",
    dateRange: "all",
    searchTerm: ""
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['rbac-logs'],
    queryFn: async () => {
      const result = await base44.entities.RBACLog.list('-created_date', 500);
      return Array.isArray(result) ? result : [];
    },
    enabled: user?.role === 'admin'
  });

  const filteredLogs = logs.filter(log => {
    if (!log) return false;
    
    if (filters.actionType !== "all" && log.action_type !== filters.actionType) return false;
    if (filters.targetType !== "all" && log.target_type !== filters.targetType) return false;
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      const matchesSearch = 
        (log.target_name || '').toLowerCase().includes(search) ||
        (log.performed_by || '').toLowerCase().includes(search) ||
        (log.performed_by_name || '').toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    if (filters.dateRange !== "all") {
      const logDate = new Date(log.created_date);
      const now = new Date();
      const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
      
      if (filters.dateRange === "today" && daysDiff > 0) return false;
      if (filters.dateRange === "week" && daysDiff > 7) return false;
      if (filters.dateRange === "month" && daysDiff > 30) return false;
    }

    return true;
  });

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleExport = () => {
    const csv = [
      ['Data', 'Ação', 'Usuário', 'Tipo Alvo', 'Nome Alvo', 'Usuários Impactados'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_date).toLocaleString('pt-BR'),
        log.action_type,
        log.performed_by_name || log.performed_by,
        log.target_type,
        log.target_name || log.target_id,
        log.affected_users_count || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbac-audit-${Date.now()}.csv`;
    a.click();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar logs de auditoria.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Logs de Auditoria RBAC</h1>
            <p className="text-gray-600">Histórico completo de alterações em permissões</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <RBACLogStats logs={filteredLogs} />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <RBACLogFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Histórico de Alterações ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RBACLogTable 
            logs={filteredLogs} 
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
          />
        </CardContent>
      </Card>

      <RBACLogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}