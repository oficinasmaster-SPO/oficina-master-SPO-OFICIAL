import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RitualAuditLog({ workshop }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workshop?.id) {
      loadLogs();
    }
  }, [workshop?.id]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter]);

  const loadLogs = async () => {
    try {
      // Buscar todas as alterações em Ritual e ScheduledRitual
      const [rituals, schedules] = await Promise.all([
        base44.entities.Ritual.filter({ workshop_id: workshop.id }),
        base44.entities.ScheduledRitual.filter({ workshop_id: workshop.id })
      ]);

      // Criar logs sintéticos baseados em created_date e updated_date
      const ritualLogs = rituals.map(r => ({
        id: `ritual-${r.id}`,
        action: "ritual_created",
        entityType: "Ritual",
        entityName: r.name,
        timestamp: r.created_date,
        user: r.created_by || "Sistema"
      }));

      const scheduleLogs = schedules.map(s => ({
        id: `schedule-${s.id}`,
        action: s.status === "concluido" ? "ritual_completed" : "ritual_scheduled",
        entityType: "Agendamento",
        entityName: s.ritual_name,
        timestamp: s.status === "concluido" ? s.completion_date : s.created_date,
        user: s.created_by || "Sistema"
      }));

      const allLogs = [...ritualLogs, ...scheduleLogs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setLogs(allLogs);
      setFilteredLogs(allLogs);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  };

  const actionLabels = {
    ritual_created: { label: "Ritual Criado", color: "bg-blue-100 text-blue-800" },
    ritual_scheduled: { label: "Ritual Agendado", color: "bg-purple-100 text-purple-800" },
    ritual_completed: { label: "Ritual Concluído", color: "bg-green-100 text-green-800" }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico de Auditoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Ações</SelectItem>
              <SelectItem value="ritual_created">Criados</SelectItem>
              <SelectItem value="ritual_scheduled">Agendados</SelectItem>
              <SelectItem value="ritual_completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        {filteredLogs.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => {
              const actionInfo = actionLabels[log.action];
              return (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {log.entityType}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{log.entityName}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span>Por: {log.user}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhum registro encontrado
          </p>
        )}
      </CardContent>
    </Card>
  );
}