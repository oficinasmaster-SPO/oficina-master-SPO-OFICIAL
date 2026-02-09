import React, { useState } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Download, RefreshCw } from "lucide-react";
import { Button } from '@/components/ui/button';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import RBACLogTable from "@/components/rbac/audit/RBACLogTable";
import RBACLogFilters from "@/components/rbac/audit/RBACLogFilters";
import RBACLogStats from "@/components/rbac/audit/RBACLogStats";
import RBACLogDetailsDialog from "@/components/rbac/audit/RBACLogDetailsDialog";

export default function LogsAuditoriaRBAC() {
  const [filters, setFilters] = useState({
    actionType: "all",
    targetType: "all",
    dateRange: "all",
    searchTerm: "",
    performedBy: "all",
    startDate: "",
    endDate: ""
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['rbac-logs'],
    queryFn: async () => {
      const result = await base44.entities.RBACLog.list('-created_date', 1000);
      return Array.isArray(result) ? result : [];
    },
    enabled: user?.role === 'admin',
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  const filteredLogs = (logs || []).filter(log => {
    if (!log || !log.id) return false;
    
    if (filters.actionType !== "all" && log.action_type !== filters.actionType) return false;
    if (filters.targetType !== "all" && log.target_type !== filters.targetType) return false;
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      const matchesSearch = 
        (log.target_name || '').toLowerCase().includes(search) ||
        (log.performed_by || '').toLowerCase().includes(search) ||
        (log.performed_by_name || '').toLowerCase().includes(search) ||
        (log.ip_address || '').toLowerCase().includes(search) ||
        (log.notes || '').toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    if (filters.dateRange !== "all" && log.created_date) {
      try {
        const logDate = new Date(log.created_date);
        const now = new Date();
        
        if (filters.dateRange === "custom") {
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            if (logDate < startDate) return false;
          }
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (logDate > endDate) return false;
          }
        } else {
          const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
          
          if (filters.dateRange === "today" && daysDiff > 0) return false;
          if (filters.dateRange === "week" && daysDiff > 7) return false;
          if (filters.dateRange === "month" && daysDiff > 30) return false;
          if (filters.dateRange === "quarter" && daysDiff > 90) return false;
          if (filters.dateRange === "year" && daysDiff > 365) return false;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    return true;
  });

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleExport = () => {
    const csv = [
      ['Data', 'Hora', 'AÃ§Ã£o', 'UsuÃ¡rio', 'Email', 'Tipo Alvo', 'Nome Alvo', 'ID Alvo', 'UsuÃ¡rios Impactados', 'IP', 'ObservaÃ§Ãµes'].join(';'),
      ...filteredLogs.map(log => [
        log.created_date ? format(new Date(log.created_date), "dd/MM/yyyy", { locale: ptBR }) : '',
        log.created_date ? format(new Date(log.created_date), "HH:mm:ss", { locale: ptBR }) : '',
        log.action_type || '',
        log.performed_by_name || '',
        log.performed_by || '',
        log.target_type || '',
        log.target_name || '',
        log.target_id || '',
        log.affected_users_count || 0,
        log.ip_address || '',
        (log.notes || '').replace(/;/g, ',')
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbac-audit-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            <p className="text-gray-600">HistÃ³rico completo de alteraÃ§Ãµes em permissÃµes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Button
            onClick={handleExport}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <RBACLogStats logs={filteredLogs} />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <RBACLogFilters 
            filters={filters} 
            onChange={setFilters}
            onReset={() => setFilters({
              actionType: "all",
              targetType: "all",
              dateRange: "all",
              searchTerm: "",
              performedBy: "all",
              startDate: "",
              endDate: ""
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            HistÃ³rico de AlteraÃ§Ãµes ({filteredLogs.length})
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



