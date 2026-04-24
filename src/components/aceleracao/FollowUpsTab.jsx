import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Check, Search, X, StickyNote, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Folder, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FollowUpsTab({ consultorEfetivo, workshops = [] }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pendentes");
  const [filterSeq, setFilterSeq] = useState("todos");
  const [openFolders, setOpenFolders] = useState({});

  const today = new Date().toISOString().split("T")[0];

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
    await base44.entities.FollowUpReminder.update(reminder.id, {
      is_completed: true,
      completed_at: new Date().toISOString(),
    });
    toast.success("Follow-up marcado como realizado!");
    queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
    queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
  };

  const handleReopen = async (reminder) => {
    await base44.entities.FollowUpReminder.update(reminder.id, {
      is_completed: false,
      completed_at: null,
    });
    toast.success("Follow-up reaberto!");
    queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
    queryClient.invalidateQueries({ queryKey: ["follow-up-reminders"] });
  };

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

  // Group by workshop — include ALL workshops, even those without follow-ups
  const grouped = useMemo(() => {
    const map = {};

    // Seed all workshops first (so they appear even with 0 follow-ups)
    // Respect searchTerm so we don't show unrelated workshops when user is searching
    const s = searchTerm.trim().toLowerCase();
    workshops.forEach(w => {
      if (!s || (w.name || "").toLowerCase().includes(s)) {
        map[w.id] = { name: w.name || "Sem nome", consultor: null, items: [] };
      }
    });

    // Fill with filtered reminders
    filtered.forEach(r => {
      const key = r.workshop_id || r.workshop_name || "sem-cliente";
      if (!map[key]) map[key] = { name: r.workshop_name || "Sem cliente", consultor: r.consultor_nome, items: [] };
      if (!map[key].consultor) map[key].consultor = r.consultor_nome;
      map[key].items.push(r);
    });

    // Sort each group by sequence_number asc
    Object.values(map).forEach(g => g.items.sort((a, b) => a.sequence_number - b.sequence_number));

    // Sort groups: overdue first, then with items, then alphabetical
    return Object.entries(map).sort(([, a], [, b]) => {
      const aOverdue = a.items.some(r => !r.is_completed && r.reminder_date < today);
      const bOverdue = b.items.some(r => !r.is_completed && r.reminder_date < today);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.items.length > 0 && b.items.length === 0) return -1;
      if (a.items.length === 0 && b.items.length > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, workshops, today]);

  const counts = useMemo(() => ({
    pendentes: reminders.filter(r => !r.is_completed).length,
    vencidos: reminders.filter(r => !r.is_completed && r.reminder_date < today).length,
    concluidos: reminders.filter(r => r.is_completed).length,
  }), [reminders, today]);

  const toggleFolder = (key) => setOpenFolders(prev => ({ ...prev, [key]: !prev[key] }));

  const expandAll = () => {
    const all = {};
    grouped.forEach(([key]) => { all[key] = true; });
    setOpenFolders(all);
  };
  const collapseAll = () => setOpenFolders({});

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

        {grouped.length > 0 && (
          <div className="flex gap-1 ml-auto">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={expandAll}>Expandir tudo</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={collapseAll}>Recolher tudo</Button>
          </div>
        )}
      </div>

      {/* Folders */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Carregando follow-ups...</div>
      ) : grouped.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <StickyNote className="w-10 h-10 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhum follow-up encontrado</p>
          <p className="text-sm text-gray-400">Ajuste os filtros para ver mais resultados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([key, group]) => {
            const isOpen = !!openFolders[key];
            const hasOverdue = group.items.some(r => !r.is_completed && r.reminder_date < today);
            const pendingCount = group.items.filter(r => !r.is_completed).length;
            const completedCount = group.items.filter(r => r.is_completed).length;

            return (
              <Card key={key} className={`overflow-hidden transition-all ${hasOverdue ? "border-red-200" : "border-gray-200"}`}>
                {/* Folder Header */}
                <button
                  onClick={() => toggleFolder(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    hasOverdue ? "bg-red-50/60" : "bg-gray-50/60"
                  }`}
                >
                  {isOpen
                    ? <FolderOpen className={`w-5 h-5 flex-shrink-0 ${hasOverdue ? "text-red-500" : "text-amber-500"}`} />
                    : <Folder className={`w-5 h-5 flex-shrink-0 ${hasOverdue ? "text-red-500" : "text-amber-500"}`} />
                  }
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-gray-800 truncate block">{group.name}</span>
                    {group.consultor && (
                      <span className="text-xs text-gray-500">{group.consultor}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {group.items.length === 0 ? (
                      <Badge className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-400 border-gray-200">
                        0 follow-ups
                      </Badge>
                    ) : (
                      <>
                        {pendingCount > 0 && (
                          <Badge className={`text-[11px] px-2 py-0.5 ${hasOverdue ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {completedCount > 0 && (
                          <Badge className="text-[11px] px-2 py-0.5 bg-green-100 text-green-700 border-green-300">
                            {completedCount} ok
                          </Badge>
                        )}
                      </>
                    )}
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Follow-up items inside folder */}
                {isOpen && (
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {group.items.map(reminder => {
                        const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
                        return (
                          <div key={reminder.id} className={`flex items-center gap-3 px-4 py-3 ${reminder.is_completed ? "bg-white opacity-70" : isOverdue ? "bg-red-50/30" : "bg-white"}`}>
                            {/* Sequence pill */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              reminder.is_completed ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {reminder.sequence_number}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-gray-700">
                                  Follow-up {reminder.sequence_number}/4
                                </span>
                                <span className="text-xs text-gray-400">·</span>
                                <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                  {reminder.reminder_date
                                    ? format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy")
                                    : "—"}
                                </span>
                                {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}
                                <span className="text-xs text-gray-400">· {reminder.days_since_meeting}d após atendimento</span>
                              </div>
                              {reminder.is_completed && reminder.completed_at && (
                                <p className="text-[11px] text-green-600 mt-0.5">
                                  Concluído em {format(new Date(reminder.completed_at), "dd/MM/yyyy")}
                                </p>
                              )}
                            </div>

                            {/* Status badge */}
                            <div className="flex-shrink-0">
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
                            </div>

                            {/* Action */}
                            <div className="flex-shrink-0">
                              {reminder.is_completed ? (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500 hover:text-gray-700" onClick={() => handleReopen(reminder)}>
                                  Reabrir
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:bg-green-100" onClick={() => handleComplete(reminder)} title="Marcar como realizado">
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          <p className="text-xs text-gray-400 text-right pt-1">
            {grouped.length} cliente{grouped.length !== 1 ? "s" : ""} · {filtered.length} follow-up{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}