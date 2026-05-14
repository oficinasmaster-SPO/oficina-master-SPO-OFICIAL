import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs } from "@/components/ui/tabs";
import { RedTabsList, RedTabsTrigger } from "@/components/ui/RedTabs";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check, Search, X, StickyNote, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Folder, FolderOpen, User, Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import FollowUpList from "./followups/FollowUpList";
import FollowUpDetail from "./followups/FollowUpDetail";
import FollowUpCompletedDetailDrawer from "./FollowUpCompletedDetailDrawer";
import FollowUpContadorRow from "./followups/FollowUpContadorRow";
import FollowUpContadorHistorico from "./followups/FollowUpContadorHistorico";
import FollowUpConcluidoRow from "./FollowUpConcluidoRow.jsx";
import RelatoriosTab from "./RelatoriosTab";
import TaxaRealizacaoRelatorio from "./TaxaRealizacaoRelatorio";
import { useFollowUpSequence } from "@/hooks/useFollowUpSequence";

// ── Componentes de módulo (fora do corpo do componente para evitar re-mount) ──

// seqNum = número sequencial global do reminder (#1, #2...) vindo do useFollowUpSequence
// stats = { total, concluidos, pendentes } do workshop desse reminder
const ReminderRow = memo(({ reminder, today, showWorkshop, onComplete, onReopen, seqNum, stats }) => {
  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const displaySeq = seqNum ?? reminder.sequence_number ?? "?";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${reminder.is_completed ? "bg-white opacity-70" : isOverdue ? "bg-red-50/30" : "bg-white"}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        reminder.is_completed ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}>
        #{displaySeq}
      </div>
      <div className="flex-1 min-w-0">
        {showWorkshop && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-700 truncate">{reminder.workshop_name || "Sem cliente"}</span>
            {stats && (
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                {stats.concluidos}/{stats.total} concluídos
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">FU #{displaySeq}{stats ? ` de ${stats.total}` : ""}</span>
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
          <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-gray-600" onClick={() => onReopen(reminder)}>
            Reabrir
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:bg-green-100" onClick={() => onComplete(reminder)} title="Marcar como realizado">
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

const EmptyState = ({ label = "Nenhum follow-up encontrado" }) => (
  <div className="py-16 flex flex-col items-center justify-center text-center space-y-2">
    <StickyNote className="w-8 h-8 text-gray-300" />
    <p className="text-gray-400 text-sm">{label}</p>
  </div>
);

const FollowUpSkeleton = () => (
  <Card className="overflow-hidden border-gray-200">
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map(key => (
        <div key={key} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-7 w-16 rounded-md flex-shrink-0" />
        </div>
      ))}
    </div>
  </Card>
);

const FlatList = ({ items, isLoading, showWorkshop = false, emptyLabel, onSelect, today, onComplete, onReopen, seqByReminderId = {}, statsByWorkshopId = {} }) => (
  isLoading ? (
    <FollowUpSkeleton />
  ) : items.length === 0 ? (
    <EmptyState label={emptyLabel} />
  ) : (
    <Card className="overflow-hidden border-gray-200">
      <div className="divide-y divide-gray-100">
        {items.map(r => (
          <button
            key={r.id}
            onClick={() => onSelect && onSelect(r)}
            className="w-full text-left hover:bg-gray-50 transition-colors"
          >
            <ReminderRow
              reminder={r}
              today={today}
              showWorkshop={showWorkshop}
              onComplete={onComplete}
              onReopen={onReopen}
              seqNum={seqByReminderId[r.id]}
              stats={statsByWorkshopId[r.workshop_id]}
            />
          </button>
        ))}
      </div>
    </Card>
  )
);

const TABS = [
  { id: "crm",        label: "Fila CRM" },
  { id: "pastas",     label: "Pastas" },
  { id: "abertos",    label: "Abertos" },
  { id: "atrasados",  label: "Atrasados" },
  { id: "consultor",  label: "Por Consultor" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "concluidos", label: "Concluídos" },
  { id: "taxa-realizacao", label: "Taxa de Realização" },
  { id: "relatorios", label: "Relatórios" },
];

export default function FollowUpsTab({ consultorEfetivo, workshops = [] }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("crm");
  const [openFolders, setOpenFolders] = useState({});

  // CRM sub-state
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [crmFilterPill, setCrmFilterPill] = useState("todos");
  const [selectedConcluido, setSelectedConcluido] = useState(null);
  const [animating, setAnimating] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // ── Camada 1: sequência universal baseada em FollowUpReminder ──
  // Calculado APÓS carregar reminders — injetado em todas as sub-telas
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["follow-up-reminders-tab", consultorEfetivo],
    queryFn: async () => {
      // Busca TODOS os follow-ups pendentes do tenant (incluindo guarda-chuva)
      // Se tiver consultor efetivo, filtra por ele OU traz follow-ups do sistema (guarda-chuva)
      const query = { is_completed: false };
      
      if (consultorEfetivo) {
        // Inclui follow-ups do consultor E follow-ups do sistema (guarda-chuva)
        query.$or = [
          { consultor_id: consultorEfetivo },
          { origin_type: "guarda_chuva" }
        ];
      }
      // Ordena por reminder_date para trazer os mais recentes primeiro
      return base44.entities.FollowUpReminder.filter(query, "-reminder_date", 500);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { seqByReminderId, statsByWorkshopId } = useFollowUpSequence(reminders);

  // Debug: Log dos follow-ups carregados
  useEffect(() => {
    console.log('[FOLLOWUP TAB] Total reminders carregados:', reminders.length);
    console.log('[FOLLOWUP TAB] consultorEfetivo:', consultorEfetivo);
    const guardaChuva = reminders.filter(r => r.origin_type === 'guarda_chuva');
    console.log(`[FOLLOWUP TAB] 🌂 Guarda-chuva encontrados: ${guardaChuva.length}`, guardaChuva.map(r => ({
      id: r.id,
      workshop: r.workshop_name,
      consultor_id: r.consultor_id,
      reminder_date: r.reminder_date
    })));
    console.log('[FOLLOWUP TAB] Primeiros 10 reminders:', reminders.slice(0, 10).map(r => ({
      id: r.id,
      workshop: r.workshop_name,
      consultor_id: r.consultor_id,
      reminder_date: r.reminder_date,
      origin_type: r.origin_type
    })));
  }, [reminders, consultorEfetivo]);

  // Verificação defensiva de vazamento de tenant
  useEffect(() => {
    if (!reminders.length || !user?.consulting_firm_id) return;
    
    const vazamento = reminders.filter(r =>
      r.consulting_firm_id &&
      r.consulting_firm_id !== user.consulting_firm_id
    );
    
    if (vazamento.length > 0) {
      console.error(
        '🚨 [TENANT LEAK] Follow-ups de outro tenant detectados:',
        vazamento.map(r => ({ id: r.id, firm: r.consulting_firm_id }))
      );
      toast.error(
        `Atenção: ${vazamento.length} follow-up(s) de outro tenant detectado(s). Contate o suporte.`,
        { duration: 10000 }
      );
    }
  }, [reminders, user?.consulting_firm_id]);

  // Fetch dos atendimentos concluídos
  const { data: concludedAttendances = [] } = useQuery({
    queryKey: ["follow-up-concluidos-tab", consultorEfetivo],
    queryFn: async () => {
      const query = {};
      if (consultorEfetivo) {
        query.consultor_id = consultorEfetivo;
      }
      return base44.entities.FollowUpConcluido.filter(query, "-completedAt", 500);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch dos FollowUpContadores (acompanhamento)
  const { data: followUpContadores = [], isLoading: isLoadingContadores } = useQuery({
    queryKey: ["follow-up-contador-tab", consultorEfetivo],
    queryFn: async () => {
      const query = {};
      if (consultorEfetivo) query.consultor_id = consultorEfetivo;
      return base44.entities.FollowUpContador.filter(query, "-data_criacao", 500);
    },
    staleTime: 3 * 60 * 1000,
  });

  const fuContadoresAtivos = useMemo(() =>
    followUpContadores.filter(f => f.status === 'ativo' || f.status === 'aguardando_proxima_semana'),
    [followUpContadores]
  );

  const fuContadoresConcluidos = useMemo(() =>
    followUpContadores.filter(f => f.status === 'concluido').sort((a, b) =>
      new Date(b.data_baixa) - new Date(a.data_baixa)
    ),
    [followUpContadores]
  );

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

  const applySearch = useCallback((list) => {
    if (!searchTerm.trim()) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(r =>
      (r.workshop_name || "").toLowerCase().includes(s) ||
      (r.consultor_nome || "").toLowerCase().includes(s)
    );
  }, [searchTerm]);

  const listAbertos = useMemo(() => {
    const pending = applySearch(reminders.filter(r => !r.is_completed));
    // Ordenação por prioridade: vencidos → hoje → futuros (dentro de cada grupo, por data)
    return pending.sort((a, b) => {
      const aVencido = a.reminder_date < today;
      const bVencido = b.reminder_date < today;
      const aHoje = a.reminder_date === today;
      const bHoje = b.reminder_date === today;
      const prioridade = (r) => r.reminder_date < today ? 0 : r.reminder_date === today ? 1 : 2;
      const pa = prioridade(a), pb = prioridade(b);
      if (pa !== pb) return pa - pb;
      return (a.reminder_date || "").localeCompare(b.reminder_date || "");
    });
  }, [reminders, today, searchTerm]);

  const listAtrasados = useMemo(() =>
    applySearch(reminders.filter(r => !r.is_completed && r.reminder_date < today))
      .sort((a, b) => (a.reminder_date || "").localeCompare(b.reminder_date || "")),
  [reminders, today, searchTerm]);

  const listConcluidos = useMemo(() => {
    // Índice de reminders pelo id para enriquecer dados de concluded
    const reminderById = {};
    reminders.forEach(r => { reminderById[r.id] = r; });

    // 1. Reminders já marcados como concluídos
    const fromReminders = applySearch(reminders.filter(r => r.is_completed))
      .map(r => ({ ...r, _source: 'reminder' }));

    // IDs de reminders que já estão na lista (evitar duplicatas)
    const includedReminderIds = new Set(fromReminders.map(r => r.id));

    // 2. Registros do FollowUpConcluido que não têm reminder duplicado
    const extra = [];
    concludedAttendances.forEach(a => {
      const refId = a.followup_id;
      if (refId && includedReminderIds.has(refId)) return; // já está via reminder
      const parentReminder = refId ? reminderById[refId] : null;
      extra.push({
        id: a.id,
        followup_id: a.followup_id,
        workshop_id: a.workshop_id || parentReminder?.workshop_id,
        workshop_name: parentReminder?.workshop_name || a.workshop_id || "Sem workshop",
        consultor_id: a.consultor_id,
        consultor_nome: a.consultor_nome,
        reminder_date: a.dataContato,
        completed_at: a.completedAt,
        is_completed: true,
        sequence_number: parentReminder?.sequence_number || 1,
        _source: 'concluded',
        _attendanceData: a,
      });
    });

    const combined = [...fromReminders, ...applySearch(extra)];
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

  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 150);
    return () => clearTimeout(t);
  }, [activeTab]);

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

        {/* Debug badge - guarda-chuva */}
        {reminders.length > 0 && (
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            <span className="font-medium text-blue-700">{reminders.filter(r => r.origin_type === 'guarda_chuva').length}</span> guarda-chuva
          </span>
        )}

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-gray-400 hover:text-gray-600 ml-auto"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
            toast.info("Atualizando lista...");
          }}
        >
          Atualizar
        </Button>

        {showSearchBar && (
          <div className="relative ml-2">
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

      {/* Tab nav — RedTabs */}
      <Tabs value={activeTab}>
        <RedTabsList>
          {TABS.map(tab => (
            <RedTabsTrigger
              key={tab.id}
              value={tab.id}
              data-state={activeTab === tab.id ? "active" : "inactive"}
              onClick={() => {
                if (tab.id === activeTab) return;
                setAnimating(true);
                setTimeout(() => {
                  setActiveTab(tab.id);
                  setSelectedReminder(null);
                  setAnimating(false);
                }, 80);
              }}
            >
              {tab.label}
            </RedTabsTrigger>
          ))}
        </RedTabsList>
      </Tabs>

      {/* Tab content */}
      <div
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(4px)' : 'translateY(0)',
          transition: 'opacity 150ms ease-out, transform 150ms ease-out',
        }}
      >

      {/* CRM Tab */}
      {activeTab === "crm" && (
        selectedReminder ? (
          <FollowUpDetail
            reminder={selectedReminder}
            today={today}
            onBack={() => setSelectedReminder(null)}
            filaReminders={listAbertos}
            seqNum={seqByReminderId[selectedReminder?.id]}
            stats={statsByWorkshopId[selectedReminder?.workshop_id]}
            onSelectReminder={(fu) => {
              setAnimating(true);
              setTimeout(() => {
                setSelectedReminder(fu);
                setAnimating(false);
              }, 80);
            }}
          />
        ) : (
          <FollowUpList
            reminders={reminders}
            today={today}
            isLoading={isLoading}
            onSelect={setSelectedReminder}
            filterPill={crmFilterPill}
            onFilterPill={setCrmFilterPill}
            seqByReminderId={seqByReminderId}
            statsByWorkshopId={statsByWorkshopId}
          />
        )
      )}

      {/* Pastas Tab */}
      {activeTab === "pastas" && (
        isLoading ? (
          <FollowUpSkeleton />
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
                        {group.items.map(r => <ReminderRow key={r.id} reminder={r} today={today} onComplete={handleComplete} onReopen={handleReopen} seqNum={seqByReminderId[r.id]} stats={statsByWorkshopId[r.workshop_id]} />)}
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
        <FlatList items={listAbertos} isLoading={isLoading} showWorkshop emptyLabel="Nenhum follow-up aberto" onSelect={setSelectedReminder} today={today} onComplete={handleComplete} onReopen={handleReopen} seqByReminderId={seqByReminderId} statsByWorkshopId={statsByWorkshopId} />
      )}

      {activeTab === "atrasados" && (
        <FlatList items={listAtrasados} isLoading={isLoading} showWorkshop emptyLabel="Nenhum follow-up atrasado" onSelect={setSelectedReminder} today={today} onComplete={handleComplete} onReopen={handleReopen} seqByReminderId={seqByReminderId} statsByWorkshopId={statsByWorkshopId} />
      )}

      {activeTab === "consultor" && (
        isLoading ? (
          <FollowUpSkeleton />
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
                    {items.map(r => <ReminderRow key={r.id} reminder={r} today={today} showWorkshop onComplete={handleComplete} onReopen={handleReopen} seqNum={seqByReminderId[r.id]} stats={statsByWorkshopId[r.workshop_id]} />)}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {activeTab === "acompanhamento" && (
         isLoadingContadores ? (
           <FollowUpSkeleton />
         ) : fuContadoresAtivos.length === 0 && fuContadoresConcluidos.length === 0 ? (
           <EmptyState label="Nenhum acompanhamento registrado. Acompanhamentos são criados automaticamente ao criar sprints ou buckets." />
         ) : (
           <div className="space-y-3">
             {fuContadoresAtivos.length > 0 && (
               <>
                 <p className="text-xs font-semibold text-gray-500 px-1 uppercase tracking-wide">Ativos ({fuContadoresAtivos.length})</p>
                 {fuContadoresAtivos.map(fu => (
                   <FollowUpContadorRow key={fu.id} fu={fu} onSelect={() => {}} />
                 ))}
               </>
             )}
             {fuContadoresAtivos.length === 0 && (
               <div className="py-6 flex flex-col items-center justify-center text-center space-y-1">
                 <CheckCircle2 className="w-7 h-7 text-green-400" />
                 <p className="text-gray-500 text-sm">Todos acompanhamentos concluídos</p>
               </div>
             )}
             {fuContadoresConcluidos.length > 0 && (
               <div className="pt-4 space-y-2">
                 <p className="text-xs font-semibold text-gray-500 px-1 uppercase tracking-wide">Histórico Recente</p>
                 {fuContadoresConcluidos.slice(0, 5).map(fu => (
                   <FollowUpContadorRow key={fu.id} fu={fu} onSelect={() => {}} />
                 ))}
               </div>
             )}
           </div>
         )
       )}

      {activeTab === "concluidos" && (
        <>
          {isLoading ? (
            <FollowUpSkeleton />
          ) : listConcluidos.length === 0 ? (
            <EmptyState label="Nenhum follow-up concluído" />
          ) : (
            <Card className="overflow-hidden border-gray-200">
              <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                <div className="w-24 flex-shrink-0">Data</div>
                <div className="w-28 flex-shrink-0">Consultor</div>
                <div className="w-20 flex-shrink-0">Canal</div>
                <div className="flex-shrink-0 ml-auto">Status</div>
              </div>
              <div className="divide-y divide-gray-100">
                {listConcluidos.map(item => (
                  <FollowUpConcluidoRow
                    key={item.id}
                    completed={item._attendanceData || item}
                    onSelect={() => setSelectedConcluido(item)}
                  />
                ))}
              </div>
            </Card>
          )}
          {selectedConcluido && (
            <FollowUpCompletedDetailDrawer
              followUp={selectedConcluido}
              open={!!selectedConcluido}
              onClose={() => setSelectedConcluido(null)}
              seqNum={seqByReminderId[selectedConcluido?.id]}
              stats={statsByWorkshopId[selectedConcluido?.workshop_id]}
            />
          )}
        </>
      )}

      {activeTab === "taxa-realizacao" && (
        <TaxaRealizacaoRelatorio />
      )}

      {activeTab === "relatorios" && (
        <RelatoriosTab />
      )}
      </div>
      </div>
      );
      }