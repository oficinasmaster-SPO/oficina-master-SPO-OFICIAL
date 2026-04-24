import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check, Search, X, StickyNote, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Folder, FolderOpen, User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import FollowUpList from "./followups/FollowUpList";
import FollowUpDetail from "./followups/FollowUpDetail";

const TABS = [
  { id: "crm",        label: "Fila CRM" },
  { id: "pastas",     label: "Pastas" },
  { id: "abertos",    label: "Abertos" },
  { id: "atrasados",  label: "Atrasados" },
  { id: "consultor",  label: "Por Consultor" },
  { id: "concluidos", label: "Concluídos" },
];

export default function FollowUpsTab({ consultorEfetivo, workshops = [] }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("crm");
  const [openFolders, setOpenFolders] = useState({});

  // CRM sub-state
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [crmFilterPill, setCrmFilterPill] = useState("todos");

  const today = new Date().toISOString().split("T")[0];

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["follow-up-reminders-tab", consultorEfetivo],
    queryFn: async () => {
      const query = {};
      if (consultorEfetivo) query.consultor_id = consultorEfetivo;
      return base44.entities.FollowUpReminder.filter(query, "reminder_date", 500);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch dos atendimentos concluídos
  const { data: concludedAttendances = [] } = useQuery({
    queryKey: ["follow-up-concluidos-tab"],
    queryFn: async () => {
      return base44.entities.FollowUpConcluido.list("-completedAt", 500);
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

  const counts = useMemo(() => ({
    pendentes: reminders.filter(r => !r.is_completed).length,
    atrasados: reminders.filter(r => !r.is_completed && r.reminder_date < today).length,
    concluidos: reminders.filter(r => r.is_completed).length + concludedAttendances.length,
  }), [reminders, concludedAttendances, today]);

  const applySearch = (list) => {
    if (!searchTerm.trim()) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(r =>
      (r.workshop_name || "").toLowerCase().includes(s) ||
      (r.consultor_nome || "").toLowerCase().includes(s)
    );
  };

  const listAbertos = useMemo(() =>
    applySearch(reminders.filter(r => !r.is_completed))
      .sort((a, b) => (a.reminder_date || "").localeCompare(b.reminder_date || "")),
  [reminders, searchTerm]);

  const listAtrasados = useMemo(() =>
    applySearch(reminders.filter(r => !r.is_completed && r.reminder_date < today))
      .sort((a, b) => (a.reminder_date || "").localeCompare(b.reminder_date || "")),
  [reminders, today, searchTerm]);

  const listConcluidos = useMemo(() => {
    // Combina reminders marcados como concluídos com os dados de FollowUpConcluido
    const fromReminders = applySearch(reminders.filter(r => r.is_completed))
      .map(r => ({ ...r, _source: 'reminder' }));
    
    const fromConcluded = applySearch(concludedAttendances)
      .map(a => ({
        id: a.id,
        followup_id: a.followup_id,
        workshop_id: a.workshop_id,
        workshop_name: a.consultor_nome ? `Workshop #${a.followup_id}` : 'Sem workshop',
        consultor_id: a.consultor_id,
        consultor_nome: a.consultor_nome,
        reminder_date: a.dataContato,
        completed_at: a.completedAt,
        is_completed: true,
        sequence_number: 1,
        _source: 'concluded',
        _attendanceData: a
      }));

    // Remove duplicatas (mesmo followup_id em ambas as listas)
    const combined = [...fromReminders];
    concludedAttendances.forEach(a => {
      if (!combined.find(r => r.followup_id === a.followup_id || r.id === a.followup_id)) {
        combined.push({
          id: a.id,
          followup_id: a.followup_id,
          workshop_id: a.workshop_id,
          workshop_name: a.consultor_nome ? `Workshop #${a.followup_id}` : 'Sem workshop',
          consultor_id: a.consultor_id,
          consultor_nome: a.consultor_nome,
          reminder_date: a.dataContato,
          completed_at: a.completedAt,
          is_completed: true,
          sequence_number: 1,
          _source: 'concluded',
          _attendanceData: a
        });
      }
    });

    return combined.sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
  }, [reminders, concludedAttendances, searchTerm]);

  const grouped = useMemo(() => {
    const map = {};
    const s = searchTerm.trim().toLowerCase();
    workshops.forEach(w => {
      if (!s || (w.name || "").toLowerCase().includes(s)) {
        map[w.id] = { name: w.name || "Sem nome", consultor: null, items: [] };
      }
    });
    const pendingReminders = reminders.filter(r => !r.is_completed);
    applySearch(pendingReminders).forEach(r => {
      const key = r.workshop_id || r.workshop_name || "sem-cliente";
      if (!map[key]) map[key] = { name: r.workshop_name || "Sem cliente", consultor: r.consultor_nome, items: [] };
      if (!map[key].consultor) map[key].consultor = r.consultor_nome;
      map[key].items.push(r);
    });
    Object.values(map).forEach(g => g.items.sort((a, b) => a.sequence_number - b.sequence_number));
    return Object.entries(map).sort(([, a], [, b]) => {
      const aOverdue = a.items.some(r => r.reminder_date < today);
      const bOverdue = b.items.some(r => r.reminder_date < today);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.items.length > 0 && b.items.length === 0) return -1;
      if (a.items.length === 0 && b.items.length > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [reminders, workshops, today, searchTerm]);

  const groupedByConsultor = useMemo(() => {
    const map = {};
    applySearch(reminders.filter(r => !r.is_completed)).forEach(r => {
      const key = r.consultor_nome || "Sem consultor";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    Object.values(map).forEach(g => g.sort((a, b) => (a.reminder_date || "").localeCompare(b.reminder_date || "")));
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [reminders, searchTerm]);

  const toggleFolder = (key) => setOpenFolders(prev => ({ ...prev, [key]: !prev[key] }));
  const expandAll = () => {
    const all = {};
    grouped.forEach(([key]) => { all[key] = true; });
    setOpenFolders(all);
  };
  const collapseAll = () => setOpenFolders({});

  const ReminderRow = ({ reminder, showWorkshop = false }) => {
    const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
    return (
      <div className={`flex items-center gap-3 px-4 py-3 ${reminder.is_completed ? "bg-white opacity-70" : isOverdue ? "bg-red-50/30" : "bg-white"}`}>
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          reminder.is_completed ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
        }`}>
          {reminder.sequence_number}
        </div>
        <div className="flex-1 min-w-0">
          {showWorkshop && (
            <span className="text-xs font-semibold text-gray-700 block truncate">{reminder.workshop_name || "Sem cliente"}</span>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600">Follow-up {reminder.sequence_number}/4</span>
            <span className="text-xs text-gray-400">·</span>
            <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
              {reminder.reminder_date ? format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy") : "—"}
            </span>
            {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}
            {reminder.consultor_nome && <span className="text-xs text-gray-400">· {reminder.consultor_nome}</span>}
          </div>
          {reminder.is_completed && reminder.completed_at && (
            <p className="text-[11px] text-green-600 mt-0.5">
              Concluído em {format(new Date(reminder.completed_at), "dd/MM/yyyy")}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {reminder.is_completed ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-gray-600" onClick={() => handleReopen(reminder)}>
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
  };

  const EmptyState = ({ label = "Nenhum follow-up encontrado" }) => (
    <div className="py-16 flex flex-col items-center justify-center text-center space-y-2">
      <StickyNote className="w-8 h-8 text-gray-300" />
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );

  const FlatList = ({ items, showWorkshop = false, emptyLabel }) => (
    isLoading ? (
      <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
    ) : items.length === 0 ? (
      <EmptyState label={emptyLabel} />
    ) : (
      <Card className="overflow-hidden border-gray-200">
        <div className="divide-y divide-gray-100">
          {items.map(r => <ReminderRow key={r.id} reminder={r} showWorkshop={showWorkshop} />)}
        </div>
      </Card>
    )
  );

  const showSearchBar = activeTab !== "crm";

  return (
    <div className="space-y-4">
      {/* Discrete stats + search */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="font-medium text-gray-700">{counts.pendentes}</span> pendentes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="font-medium text-gray-700">{counts.atrasados}</span> atrasados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span className="font-medium text-gray-700">{counts.concluidos}</span> concluídos
        </span>

        {showSearchBar && (
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Buscar cliente ou consultor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-7 text-sm w-60"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab nav — grid */}
      <div className={`grid border border-gray-200 rounded-lg overflow-hidden text-sm`} style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedReminder(null);
            }}
            className={`py-2 px-2 font-medium text-center transition-colors whitespace-nowrap ${i > 0 ? "border-l border-gray-200" : ""} ${
              activeTab === tab.id
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}

      {/* CRM Tab */}
      {activeTab === "crm" && (
        selectedReminder ? (
          <FollowUpDetail
            reminder={selectedReminder}
            today={today}
            onBack={() => setSelectedReminder(null)}
          />
        ) : (
          <FollowUpList
            reminders={reminders}
            today={today}
            isLoading={isLoading}
            onSelect={setSelectedReminder}
            filterPill={crmFilterPill}
            onFilterPill={setCrmFilterPill}
          />
        )
      )}

      {/* Pastas Tab */}
      {activeTab === "pastas" && (
        isLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
        ) : grouped.length === 0 ? (
          <EmptyState label="Nenhum cliente encontrado" />
        ) : (
          <div className="space-y-2">
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400" onClick={expandAll}>Expandir tudo</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400" onClick={collapseAll}>Recolher tudo</Button>
            </div>
            {grouped.map(([key, group]) => {
              const isOpen = !!openFolders[key];
              const hasOverdue = group.items.some(r => r.reminder_date < today);
              const pendingCount = group.items.filter(r => !r.is_completed).length;
              const completedCount = group.items.filter(r => r.is_completed).length;
              return (
                <Card key={key} className={`overflow-hidden ${hasOverdue ? "border-red-200" : "border-gray-200"}`}>
                  <button
                    onClick={() => toggleFolder(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${hasOverdue ? "bg-red-50/40" : "bg-gray-50/40"}`}
                  >
                    {isOpen
                      ? <FolderOpen className={`w-4 h-4 flex-shrink-0 ${hasOverdue ? "text-red-500" : "text-amber-500"}`} />
                      : <Folder className={`w-4 h-4 flex-shrink-0 ${hasOverdue ? "text-red-500" : "text-amber-500"}`} />
                    }
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-gray-800 truncate block">{group.name}</span>
                      {group.consultor && <span className="text-xs text-gray-400">{group.consultor}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {group.items.length === 0 ? (
                        <Badge className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-400 border-gray-200">0 follow-ups</Badge>
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
                      {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {isOpen && group.items.length > 0 && (
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {group.items.map(r => <ReminderRow key={r.id} reminder={r} />)}
                      </div>
                    </CardContent>
                  )}
                  {isOpen && group.items.length === 0 && (
                    <CardContent className="py-4 text-center text-xs text-gray-400">Nenhum follow-up pendente</CardContent>
                  )}
                </Card>
              );
            })}
            <p className="text-xs text-gray-400 text-right pt-1">
              {grouped.length} cliente{grouped.length !== 1 ? "s" : ""} · {listAbertos.length} abertos
            </p>
          </div>
        )
      )}

      {activeTab === "abertos" && (
        <FlatList items={listAbertos} showWorkshop emptyLabel="Nenhum follow-up aberto" />
      )}

      {activeTab === "atrasados" && (
        <FlatList items={listAtrasados} showWorkshop emptyLabel="Nenhum follow-up atrasado" />
      )}

      {activeTab === "consultor" && (
        isLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
        ) : groupedByConsultor.length === 0 ? (
          <EmptyState label="Nenhum follow-up encontrado" />
        ) : (
          <div className="space-y-3">
            {groupedByConsultor.map(([consultor, items]) => {
              const hasOverdue = items.some(r => r.reminder_date < today);
              return (
                <Card key={consultor} className={`overflow-hidden ${hasOverdue ? "border-red-200" : "border-gray-200"}`}>
                  <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 ${hasOverdue ? "bg-red-50/40" : "bg-gray-50/40"}`}>
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-sm text-gray-700">{consultor}</span>
                    <Badge className="ml-auto text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 border-gray-200">
                      {items.length} follow-up{items.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map(r => <ReminderRow key={r.id} reminder={r} showWorkshop />)}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {activeTab === "concluidos" && (
        <FlatList items={listConcluidos} showWorkshop emptyLabel="Nenhum follow-up concluído" />
      )}
    </div>
  );
}