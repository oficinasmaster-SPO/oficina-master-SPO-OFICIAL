import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronRight,
  Clock, Play, CheckCircle2, Lock, LayoutList, Plus } from
"lucide-react";
import BacklogIssueRow from "./BacklogIssueRow";
import BacklogDetailDrawer from "./BacklogDetailDrawer";
import NovoTarefaModal from "./NovoTarefaModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import TarefaBacklogForm from "./TarefaBacklogForm";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import { useWorkshopLogos } from "@/hooks/useWorkshopLogos";

// ── Grupos de status (ordem do board) ─────────────────────────────────────
const STATUS_GROUPS = [
{
  key: "em_execucao",
  label: "Em Execução",
  icon: Play,
  iconClass: "text-blue-500",
  headerClass: "bg-blue-50 border-blue-200",
  badgeClass: "bg-blue-500"
},
{
  key: "aberta",
  label: "To Do",
  icon: LayoutList,
  iconClass: "text-gray-500",
  headerClass: "bg-gray-50 border-gray-200",
  badgeClass: "bg-gray-500"
},
{
  key: "aguardando_cliente",
  label: "Aguardando Cliente",
  icon: Clock,
  iconClass: "text-amber-500",
  headerClass: "bg-amber-50 border-amber-200",
  badgeClass: "bg-amber-500"
},
{
  key: "bloqueada",
  label: "Bloqueada",
  icon: Lock,
  iconClass: "text-red-500",
  headerClass: "bg-red-50 border-red-200",
  badgeClass: "bg-red-500"
},
{
  key: "concluida",
  label: "Concluída",
  icon: CheckCircle2,
  iconClass: "text-green-500",
  headerClass: "bg-green-50 border-green-200",
  badgeClass: "bg-green-500"
}];


// ── Cabeçalho de grupo colapsável ───────────────────────────────────────────
function GroupHeader({ group, count, collapsed, onToggle }) {
  const Icon = group.icon;
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2 border-y px-3 py-2 text-left transition-colors hover:brightness-95 ${group.headerClass}`}>
      
      {collapsed ?
      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" /> :
      <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      <Icon className={`h-3.5 w-3.5 shrink-0 ${group.iconClass}`} />
      <span className="text-xs font-semibold text-gray-700">{group.label}</span>
      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${group.badgeClass}`}>
        {count}
      </span>
    </button>);

}

// ── Componente principal ────────────────────────────────────────────────────
export default function BacklogBoard({ workshopId, user, tarefas: tarefasProp, isLoading: isLoadingProp, hasFilters, onClearFilters, showNovoTarefaModal: extShow, setShowNovoTarefaModal: extSetShow, scope = "todos" }) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Modo dual: controlado (container pai passa tarefas/filtros) ou autônomo
  // (PedidosInternosTab monta direto). Quando autônomo, busca as próprias
  // tarefas e gerencia seu próprio modal "Nova tarefa" — caso contrário o
  // board renderizaria vazio, pois nenhum pai passa `tarefas`.
  const controlled = tarefasProp !== undefined;
  const { data: internalTarefas = [], isLoading: internalLoading } = useQuery({
    queryKey: ["tarefas-backlog", workshopId],
    queryFn: async () => {
      const all = workshopId ?
      await base44.entities.TarefaBacklog.filter({ workshop_id: workshopId }, "-prazo", 300) :
      await base44.entities.TarefaBacklog.list("-prazo", 300);
      return all || [];
    },
    enabled: !controlled
  });
  const tarefas = controlled ? tarefasProp : internalTarefas;
  const isLoading = controlled ? !!isLoadingProp : internalLoading;
  const [intShow, intSetShow] = useState(false);
  const showNovoTarefaModal = controlled ? extShow : intShow;
  const setShowNovoTarefaModal = controlled ? extSetShow : intSetShow;

  // Painel: null | 'detail' | 'form'
  const [panelMode, setPanelMode] = useState(null);
  const [selectedTarefa, setSelectedTarefa] = useState(null);
  const [editingTarefa, setEditingTarefa] = useState(null);
  // Grupos colapsados
  const [collapsed, setCollapsed] = useState({ concluida: true });
  const toggleGroup = useCallback(
    (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] })),
    []
  );

  // ── Data (workshops p/ formulários) ───────────────────────────────────────
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops-backlog"],
    queryFn: async () => (await base44.entities.Workshop.list("name", 200)) || []
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TarefaBacklog.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas-backlog"] })
  });

  // ── Resolvers canônicos (nomes/fotos/logos) ──────────────────────────────
  const { getName, getPhoto } = useEmployeeResolver();
  const workshopIds = useMemo(
    () => [...new Set(tarefas.map((t) => t.workshop_id).filter(Boolean))],
    [tarefas]
  );
  const logosByWorkshop = useWorkshopLogos(workshopIds);

  const hoje = useMemo(() => {
    const d = new Date();d.setHours(0, 0, 0, 0);return d;
  }, []);

  // Lista já filtrada pelo container (PedidosContainer); em modo autônomo,
  // aplica o filtro de escopo (Todas/Minhas tarefas) recebido do pai.
  const filteredAll = useMemo(() => {
    if (scope === "todos" || !user?.id) return tarefas;
    const uid = user.id;
    return tarefas.filter((t) => t.assignee_id === uid || t.requester_id === uid || t.created_by_id === uid);
  }, [tarefas, scope, user?.id]);

  // Agrupar por status
  const grouped = useMemo(() => {
    const map = {};
    STATUS_GROUPS.forEach((g) => {map[g.key] = [];});
    filteredAll.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    // ordenar cada grupo: vencidas primeiro, depois por prazo
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const vA = a.prazo && new Date(a.prazo) < hoje ? 0 : 1;
        const vB = b.prazo && new Date(b.prazo) < hoje ? 0 : 1;
        if (vA !== vB) return vA - vB;
        if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
        return 0;
      });
    });
    return map;
  }, [filteredAll, hoje]);

  // Linha cheia (colunas Cliente/Consultor/Abertura) só em desktop sem painel aberto
  const fullRow = !isMobile && panelMode === null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleView = useCallback((tarefa) => {
    setSelectedTarefa(tarefa);
    setPanelMode("detail");
  }, []);
  const handleEdit = useCallback((tarefa) => {
    setEditingTarefa(tarefa);
    setPanelMode("form");
  }, []);
  const handlePanelClose = useCallback(() => {
    setSelectedTarefa(null);
    setEditingTarefa(null);
    setPanelMode(null);
  }, []);
  const handleFormCancel = useCallback(() => {
    if (editingTarefa) {
      setSelectedTarefa(editingTarefa);
      setPanelMode("detail");
    } else {
      setPanelMode(null);
      setSelectedTarefa(null);
    }
  }, [editingTarefa]);
  const handleFormSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tarefas-backlog"] });
    if (editingTarefa) {
      setSelectedTarefa(editingTarefa);
      setPanelMode("detail");
    } else {
      setPanelMode(null);
      setSelectedTarefa(null);
    }
    setEditingTarefa(null);
  }, [queryClient, editingTarefa]);

  // Sincroniza o selectedTarefa com dados frescos após mutação
  const freshSelected = useMemo(() => {
    if (!selectedTarefa) return null;
    return tarefas.find((t) => t.id === selectedTarefa.id) || selectedTarefa;
  }, [selectedTarefa, tarefas]);

  // ── Navegação por teclado ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {handlePanelClose();return;}
      if (panelMode !== "detail" || !selectedTarefa) return;
      const idx = filteredAll.findIndex((t) => t.id === selectedTarefa.id);
      if (e.key === "ArrowDown" && idx < filteredAll.length - 1) handleView(filteredAll[idx + 1]);
      if (e.key === "ArrowUp" && idx > 0) handleView(filteredAll[idx - 1]);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedTarefa, filteredAll, panelMode, handleView, handlePanelClose]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">



      {/* ── Cabeçalho das colunas ── */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <span className="w-6 shrink-0" />
          <span className="w-[64px] shrink-0">Código</span>
          <span className="flex-1 min-w-0">Chamado</span>
          {fullRow && <span className="w-[150px] shrink-0">Cliente</span>}
          {fullRow && <span className="w-[150px] shrink-0">Consultor</span>}
          {fullRow && <span className="w-[80px] shrink-0">Abertura</span>}
          <span className="w-5 shrink-0 text-center">P</span>
          <span className="w-[72px] shrink-0 text-right">Prazo</span>
          <span className="w-[120px] shrink-0 text-right">Status</span>
        </div>
      </div>

      {/* ── Split container ── */}
      <div className="flex min-h-0 flex-1">
        <div className="flex flex-col min-h-0 w-full">
      {/* ── Lista agrupada ── */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {isLoading ?
            <div className="space-y-0">
            {[...Array(8)].map((_, i) =>
              <div key={i} className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 animate-pulse">
                <div className="h-5 w-5 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="h-3 flex-1 rounded bg-gray-100" />
                <div className="h-5 w-16 rounded-full bg-gray-100" />
              </div>
              )}
          </div> :

            STATUS_GROUPS.map((group) => {
              const items = grouped[group.key] || [];
              if (items.length === 0 && group.key !== "aberta") return null;
              return (
                <div key={group.key}>
                <GroupHeader
                    group={group}
                    count={items.length}
                    collapsed={!!collapsed[group.key]}
                    onToggle={() => toggleGroup(group.key)} />
                  
                {!collapsed[group.key] &&
                  <>
                    {items.length === 0 ?
                    <div className="px-4 py-3 text-xs text-gray-400 italic">
                        Nenhuma tarefa
                      </div> :

                    items.map((tarefa) =>
                    <BacklogIssueRow
                      key={tarefa.id}
                      tarefa={tarefa}
                      consultorName={getName(tarefa.assignee_id, tarefa.assignee_name)}
                      consultorPhoto={getPhoto(tarefa.assignee_id)}
                      logoUrl={logosByWorkshop[tarefa.workshop_id]}
                      onView={handleView}
                      isSelected={panelMode === "detail" && selectedTarefa?.id === tarefa.id}
                      fullRow={fullRow} />

                    )
                    }
                  </>
                  }
              </div>);

            })
            }

        {!isLoading && filteredAll.length === 0 &&
            <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">Nenhuma tarefa encontrada</p>
            {hasFilters &&
              <button onClick={onClearFilters} className="mt-1 text-xs text-blue-500 hover:underline">
                Limpar filtros
              </button>
              }
          </div>
            }
      </div>
        </div>
      </div>

      {/* ── Drawer overlay (portal em document.body — não empurra a lista) ── */}
      {panelMode && !isMobile && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 animate-in fade-in duration-150"
            onClick={handlePanelClose} />
          
          <div className="relative h-full w-[44%] min-w-[420px] max-w-[640px] shadow-2xl">
            {panelMode === "form" ?
            <TarefaBacklogForm
              inline
              tarefa={editingTarefa}
              user={user}
              workshops={workshops}
              workshopId={workshopId}
              onCancel={handleFormCancel}
              onSuccess={handleFormSuccess} /> :

            freshSelected ?
            <BacklogDetailDrawer
              tarefa={freshSelected}
              user={user}
              onClose={handlePanelClose}
              onEdit={handleEdit} /> :

            null}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile sheet */}
      <Sheet open={panelMode !== null && isMobile} onOpenChange={(open) => {if (!open) handlePanelClose();}}>
        <SheetContent side="bottom" className="h-[85dvh] p-0">
          {panelMode === "form" ?
          <div className="h-full">
              <TarefaBacklogForm
              inline
              tarefa={editingTarefa}
              user={user}
              workshops={workshops}
              workshopId={workshopId}
              onCancel={handleFormCancel}
              onSuccess={handleFormSuccess} />
            
            </div> :
          freshSelected ?
          <BacklogDetailDrawer
            tarefa={freshSelected}
            user={user}
            onClose={handlePanelClose}
            onEdit={handleEdit}
            hideCloseButton /> :

          null}
        </SheetContent>
      </Sheet>

      {showNovoTarefaModal &&
      <NovoTarefaModal
        user={user}
        workshopId={workshopId}
        workshops={workshops}
        onClose={() => setShowNovoTarefaModal(false)} />

      }
    </div>);

}