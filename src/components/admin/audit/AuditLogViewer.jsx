import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download } from "lucide-react";
import AuditLogTable from "./AuditLogTable";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogStats from "./AuditLogStats";

export default function AuditLogViewer() {
  const [filters, setFilters] = useState({
    user_email: "",
    action: "all",
    entity_type: "all",
    date_from: "",
    date_to: ""
  });
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const allLogs = await base44.entities.UserActivityLog.list('-timestamp', 500);
      
      // Aplicar filtros
      let filtered = allLogs;
      
      if (filters.user_email) {
        filtered = filtered.filter(log => 
          log.user_email?.toLowerCase().includes(filters.user_email.toLowerCase())
        );
      }
      
      if (filters.action !== "all") {
        filtered = filtered.filter(log => log.action === filters.action);
      }
      
      if (filters.entity_type !== "all") {
        filtered = filtered.filter(log => log.entity_type === filters.entity_type);
      }
      
      if (filters.date_from) {
        filtered = filtered.filter(log => 
          new Date(log.timestamp) >= new Date(filters.date_from)
        );
      }
      
      if (filters.date_to) {
        filtered = filtered.filter(log => 
          new Date(log.timestamp) <= new Date(filters.date_to)
        );
      }
      
      if (search) {
        filtered = filtered.filter(log => 
          log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
          log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
          log.action?.toLowerCase().includes(search.toLowerCase()) ||
          JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return filtered;
    },
    staleTime: 30000
  });

  const handleExport = () => {
    const csv = [
      ['Data/Hora', 'Usuário', 'Email', 'Ação', 'Tipo', 'Detalhes'],
      ...logs.map(log => [
        new Date(log.timestamp).toLocaleString('pt-BR'),
        log.user_name,
        log.user_email,
        log.action,
        log.entity_type || '-',
        JSON.stringify(log.details || {})
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Logs de Auditoria</h2>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <AuditLogStats logs={logs} />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar em logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <AuditLogFilters filters={filters} onFilterChange={setFilters} />
          </div>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}