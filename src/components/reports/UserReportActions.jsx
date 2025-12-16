import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, Edit, Trash2, Eye, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function UserReportActions({ userData, filters }) {
  const { activityLogs } = userData;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");

  // Estatísticas de ações
  const actionStats = useMemo(() => {
    const stats = {};
    activityLogs.forEach(log => {
      const type = log.action_type || 'unknown';
      if (!stats[type]) {
        stats[type] = 0;
      }
      stats[type]++;
    });
    return stats;
  }, [activityLogs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchSearch = !searchTerm || 
        log.page_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAction = actionFilter === 'all' || log.action_type === actionFilter;
      
      return matchSearch && matchAction;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activityLogs, searchTerm, actionFilter]);

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'create': return <Plus className="w-4 h-4" />;
      case 'update': return <Edit className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'view': return <Eye className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getActionBadgeColor = (actionType) => {
    switch (actionType) {
      case 'create': return 'bg-green-100 text-green-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'view': return 'bg-slate-100 text-slate-700';
      case 'error': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo de Ações */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(actionStats).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getActionIcon(type)}
                  <span className="text-xs font-medium capitalize">{type}</span>
                </div>
                <Badge variant="outline">{count}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar ações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.keys(actionStats).map(type => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ações ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma ação encontrada</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getActionBadgeColor(log.action_type)}`}>
                        {getActionIcon(log.action_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getActionBadgeColor(log.action_type)}>
                            {log.action_type}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900">
                            {log.page_name}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                        )}
                        {log.entity_type && (
                          <p className="text-xs text-slate-500 mt-1">
                            Entidade: {log.entity_type}
                            {log.entity_id && ` (ID: ${log.entity_id})`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}