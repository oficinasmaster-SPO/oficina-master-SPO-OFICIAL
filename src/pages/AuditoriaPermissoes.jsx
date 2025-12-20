import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Shield } from "lucide-react";
import AuditStats from "@/components/rbac/audit/AuditStats";
import AuditFilters from "@/components/rbac/audit/AuditFilters";
import AuditLogTable from "@/components/rbac/audit/AuditLogTable";
import AuditDetailsDialog from "@/components/rbac/audit/AuditDetailsDialog";
import { toast } from "sonner";

export default function AuditoriaPermissoes() {
  const [filters, setFilters] = useState({
    searchTerm: '',
    actionType: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-audit'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const allLogs = useMemo(() => {
    const logs = [];
    employees.forEach(emp => {
      if (emp.audit_log && Array.isArray(emp.audit_log)) {
        emp.audit_log.forEach(log => {
          logs.push({
            ...log,
            employee_id: emp.id,
            employee_name: emp.full_name
          });
        });
      }
    });
    return logs.sort((a, b) => {
      const dateA = new Date(a.changed_at || 0);
      const dateB = new Date(b.changed_at || 0);
      return dateB - dateA;
    });
  }, [employees]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesSearch = !filters.searchTerm || 
        log.employee_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        log.changed_by?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        log.changed_by_email?.toLowerCase().includes(filters.searchTerm.toLowerCase());

      const matchesAction = filters.actionType === 'all' || log.action === filters.actionType;

      const logDate = new Date(log.changed_at);
      const matchesDateFrom = !filters.dateFrom || logDate >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || logDate <= new Date(filters.dateTo + 'T23:59:59');

      return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo;
    });
  }, [allLogs, filters]);

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      actionType: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Data/Hora', 'Usuário', 'Ação', 'Campo', 'Valor Anterior', 'Novo Valor', 'Alterado Por', 'Email'].join(','),
        ...filteredLogs.map(log => [
          log.changed_at || '',
          log.employee_name || '',
          log.action || '',
          log.field_changed || '',
          log.old_value || '',
          log.new_value || '',
          log.changed_by || '',
          log.changed_by_email || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-permissoes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Relatório exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando logs de auditoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Auditoria de Permissões
          </h1>
          <p className="text-gray-600 mt-2">
            Histórico completo de todas as alterações de permissões do sistema
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <AuditStats logs={filteredLogs} />

      <AuditFilters 
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-4">
          Logs de Auditoria ({filteredLogs.length})
        </h2>
        <AuditLogTable 
          logs={filteredLogs}
          onViewDetails={handleViewDetails}
        />
      </div>

      <AuditDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        log={selectedLog}
      />
    </div>
  );
}