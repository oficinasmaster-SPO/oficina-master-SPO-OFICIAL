import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Search, X, StickyNote, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FollowUpsTab({ consultorEfetivo, consultores }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pendentes"); // "todos" | "pendentes" | "concluidos"
  const [filterSeq, setFilterSeq] = useState("todos"); // "1"|"2"|"3"|"4"|"todos"

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["follow-up-reminders-tab", consultorEfetivo],
    queryFn: async () => {
      const query = {};
      if (consultorEfetivo) query.consultor_id = consultorEfetivo;
      return base44.entities.FollowUpReminder.filter(query, "-reminder_date", 500);
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleComplete = async (reminder) => {
    try {
      await base44.entities.FollowUpReminder.update(reminder.id, {
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      toast.success("Follow-up marcado como realizado!");
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
    } catch (e) {
      toast.error("Erro ao atualizar: " + e.message);
    }
  };

  const handleReopen = async (reminder) => {
    try {
      await base44.entities.FollowUpReminder.update(reminder.id, {
        is_completed: false,
        completed_at: null,
      });
      toast.success("Follow-up reaberto!");
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
      queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
    } catch (e) {
      toast.error("Erro ao reabrir: " + e.message);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    let list = reminders;
    if (filterStatus === "pendentes") list = list.filter(r => !r.is_completed);
    else if (filterStatus === "concluidos") list = list.filter(r => r.is_completed);
    if (filterSeq !== "todos") list = list.filter(r => String(r.sequence_number) === filterSeq);
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(r =>
        (r.workshop_name || "").toLowerCase().includes(s) ||
        (r.consultor_nome || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [reminders, filterStatus, filterSeq, searchTerm]);

  const counts = useMemo(() => ({
    pendentes: reminders.filter(r => !r.is_completed).length,
    vencidos: reminders.filter(r => !r.is_completed && r.reminder_date < today).length,
    concluidos: reminders.filter(r => r.is_completed).length,
  }), [reminders, today]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{counts.pendentes}</div>
          <div className="text-xs text-amber-600 mt-0.5">Pendentes</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{counts.vencidos}</div>
          <div className="text-xs text-red-600 mt-0.5">Vencidos</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{counts.concluidos}</div>
          <div className="text-xs text-green-600 mt-0.5">Concluídos</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Buscar cliente ou consultor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 gap-1">
          {[
            { value: "pendentes", label: "Pendentes" },
            { value: "concluidos", label: "Concluídos" },
            { value: "todos", label: "Todos" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                filterStatus === opt.value ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-red-600 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Select value={filterSeq} onValueChange={setFilterSeq}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Sequência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas sequências</SelectItem>
            <SelectItem value="1">Follow-up 1 (7d)</SelectItem>
            <SelectItem value="2">Follow-up 2 (14d)</SelectItem>
            <SelectItem value="3">Follow-up 3 (21d)</SelectItem>
            <SelectItem value="4">Follow-up 4 (28d)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4 px-2 sm:px-4">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400">Carregando follow-ups...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <StickyNote className="w-10 h-10 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhum follow-up encontrado</p>
              <p className="text-sm text-gray-400">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: "750px" }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100">Cliente</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: 130 }}>Consultor</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: 120 }}>Data Lembrete</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: 110 }}>Sequência</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: 110 }}>Status</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: 80 }}>Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(reminder => {
                    const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
                    return (
                      <tr key={reminder.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 text-sm font-medium text-gray-800 border-r border-gray-100">
                          {reminder.workshop_name || "—"}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100 truncate">
                          {reminder.consultor_nome || "—"}
                        </td>
                        <td className="py-3 px-3 text-sm border-r border-gray-100 whitespace-nowrap">
                          <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-600"}>
                            {reminder.reminder_date ? format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy") : "—"}
                          </span>
                          {isOverdue && <AlertCircle className="w-3.5 h-3.5 inline ml-1 text-red-500" />}
                        </td>
                        <td className="py-3 px-3 border-r border-gray-100">
                          <Badge variant="outline" className="text-[11px] font-medium text-amber-700 border-amber-300 bg-amber-50">
                            <StickyNote className="w-3 h-3 mr-1" />
                            {reminder.sequence_number}/4 · {reminder.days_since_meeting}d
                          </Badge>
                        </td>
                        <td className="py-3 px-3 border-r border-gray-100">
                          {reminder.is_completed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Concluído
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              Vencido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {reminder.is_completed ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-gray-500 hover:text-gray-700"
                              onClick={() => handleReopen(reminder)}
                            >
                              Reabrir
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                              onClick={() => handleComplete(reminder)}
                              title="Marcar como realizado"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 text-right mt-3">
                {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}