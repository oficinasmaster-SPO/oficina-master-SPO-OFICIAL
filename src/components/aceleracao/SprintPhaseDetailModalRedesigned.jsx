import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Send,
  ListChecks, PlaySquare, BarChart2, TrendingUp, MessageSquare,
  Plus, Save, Loader2
} from "lucide-react";
import SprintPhaseProgress from "./sprint-client/SprintPhaseProgress";
import SprintTaskItem from "./sprint-client/SprintTaskItem";
import ConsultorReviewPanel from "./sprint-consultant/ConsultorReviewPanel";
import SprintActivityTimeline from "./sprint-shared/SprintActivityTimeline";
import SprintCompletionSummary from "./sprint-shared/SprintCompletionSummary";
import VideoUploadRecorder from "./VideoUploadRecorder";

const PHASES_CONFIG = [
  { name: "Planning", label: "Sprint Planning", icon: ListChecks, color: "text-blue-600", bg: "bg-blue-50" },
  { name: "Execution", label: "Execução", icon: PlaySquare, color: "text-green-600", bg: "bg-green-50" },
  { name: "Monitoring", label: "Checkpoint", icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
  { name: "Review", label: "Sprint Review", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  { name: "Retrospective", label: "Retrospectiva", icon: MessageSquare, color: "text-red-600", bg: "bg-red-50" },
];

const STATUS_OPTIONS = [
  { value: "not_started", label: "Não iniciado", icon: <Circle className="w-4 h-4 text-gray-400" /> },
  { value: "in_progress", label: "Em andamento", icon: <Clock className="w-4 h-4 text-blue-500" /> },
  { value: "completed", label: "Concluído", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
];

export default function SprintPhaseDetailModalRedesigned({
  sprint: sprintProp,
  phaseIndex = 0,
  onClose,
  onSaved,
  onNavigateToPhase,
  onNavigateToNextSprint,
}) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(true);
  const isSavingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Buscar dados frescos do banco — staleTime curto para evitar stale closure sem flood de requests
  const { data: freshSprint } = useQuery({
    queryKey: ['sprint-detail', sprintProp?.id],
    queryFn: () => base44.entities.ConsultoriaSprint.get(sprintProp.id),
    enabled: !!sprintProp?.id,
    staleTime: 5 * 1000, // 5s — suficiente para não refetch em cada render
    refetchOnWindowFocus: false,
  });

  // Usar dados frescos se disponíveis, senão usar o prop (enquanto carrega)
  const sprint = freshSprint || sprintProp;
  const phases = sprint?.phases || [];
  const currentPhase = phases[phaseIndex];
  const config = PHASES_CONFIG.find(p => p.name === currentPhase?.name) || PHASES_CONFIG[0];
  const Icon = config.icon;

  const [status, setStatus] = useState(currentPhase?.status || "not_started");
  const [notes, setNotes] = useState(currentPhase?.notes || "");
  const [tasks, setTasks] = useState(currentPhase?.tasks || []);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);

  // Sincroniza estado local APENAS quando muda de fase ou de sprint — nunca durante um save
  useEffect(() => {
    if (isSavingRef.current) return;
    const phase = phases[phaseIndex];
    if (phase) {
      setStatus(phase.status || "not_started");
      setNotes(phase.notes || "");
      setTasks(phase.tasks || []);
    }
  }, [phaseIndex, sprint?.id]);

  // Proteger contra fechamento acidental do modal
  const handleModalOpenChange = (open) => {
    if (!open) {
      setModalOpen(false);
      onClose();
    }
  };

  const persistPhases = async (updatedPhases, { suppressToast = false } = {}) => {
    if (isSavingRef.current) return false; // Guard duplo-save
    isSavingRef.current = true;
    setSaving(true);

    const totalTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
    const doneTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
    const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const allCompleted = updatedPhases.every(p => p.status === "completed");

    let success = false;
    try {
      // R3-01: Preservar status 'overdue' — não sobrescrever com 'in_progress' se sprint está atrasado
      const currentStatus = sprint.status;
      const newStatus = allCompleted ? "completed" : (currentStatus === "overdue" ? "overdue" : "in_progress");
      await base44.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: taskProgress,
        status: newStatus,
        last_activity_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['sprint-detail', sprint.id] });
      setTimeout(() => {
        if (!isMountedRef.current) return;
        queryClient.invalidateQueries({ queryKey: ['dashboard-sprints'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['sprints-client'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['sprints-reais'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['active-sprint-widget'], exact: false });
      }, 1500);
      if (!suppressToast) toast.success("Alteração salva com sucesso!");
      success = true;
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar fase");
    } finally {
      if (isMountedRef.current) setSaving(false);
      setTimeout(() => { isSavingRef.current = false; }, 200);
    }
    return success;
  };

  const handleSave = async () => {
    const updatedPhases = [...phases];
    const now = new Date().toISOString();
    const existingHistory = updatedPhases[phaseIndex].review_history || [];
    const wasCompleted = updatedPhases[phaseIndex].status === "completed";
    const isNowCompleted = status === "completed";

    const completionFields = isNowCompleted && !wasCompleted ? {
      completion_date: now,
      reviewed_at: now,
      reviewed_by: "consultor",
      review_history: [
        ...existingHistory,
        { action: "approved", date: now, actor: "consultor", feedback: "" },
      ],
    } : {};
    const clearFields = !isNowCompleted && wasCompleted ? {
      completion_date: null,
    } : {};
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status,
      notes,
      tasks,
      ...completionFields,
      ...clearFields,
    };
    await persistPhases(updatedPhases);
    // Nota: persistPhases já exibe toast.success — não duplicar aqui
  };

  // Review actions for consultant
  const handleApprovePhase = async (feedback) => {
    try {
      const updatedPhases = [...phases];
      const now = new Date().toISOString();
      const existingHistory = updatedPhases[phaseIndex].review_history || [];
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        status: "completed",
        completion_date: now,
        reviewed_at: now,
        reviewed_by: "consultor",
        review_feedback: feedback || "",
        review_history: [
          ...existingHistory,
          { action: "approved", date: now, actor: "consultor", feedback: feedback || "" },
        ],
      };
      const ok = await persistPhases(updatedPhases, { suppressToast: true });
      if (ok) {
      toast.success("Fase aprovada!");
      base44.functions.invoke("notifySprintPhaseChange", {
        sprint_id: sprint.id,
        phase_name: currentPhase.name,
        action: "approved",
        feedback: feedback || "",
      }).catch(() => {});
      // canGoForward é declarado abaixo mas só usado após o render — safe
      if (phaseIndex < phases.length - 1) {
        onNavigateToPhase(phaseIndex + 1);
      } else if (onSaved) {
          // Só chamar onSaved se explicitamente necessário
          onSaved();
        }
      }
    } catch (error) {
      console.error("Erro ao aprovar fase:", error);
      toast.error("Erro ao aprovar fase");
    }
  };

  const handleReturnPhase = async (feedback) => {
    try {
      const updatedPhases = [...phases];
      const now = new Date().toISOString();
      const existingHistory = updatedPhases[phaseIndex].review_history || [];
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        status: "in_progress",
        completion_date: null,
        submitted_for_review_at: null,
        submitted_for_review_by: null,
        reviewed_at: now,
        reviewed_by: "consultor",
        review_feedback: feedback,
        review_history: [
          ...existingHistory,
          { action: "returned", date: now, actor: "consultor", feedback },
        ],
      };
      const ok = await persistPhases(updatedPhases, { suppressToast: true });
      if (ok) {
        toast.success("Fase devolvida para a oficina com feedback.");
        base44.functions.invoke("notifySprintPhaseChange", {
          sprint_id: sprint.id,
          phase_name: currentPhase.name,
          action: "returned",
          feedback,
        }).catch(() => {});
        // Modal permanece aberto para o usuário continuar editando
      }
    } catch (error) {
      console.error("Erro ao devolver fase:", error);
      toast.error("Erro ao devolver fase");
    }
  };

  const handleToggleTask = async (taskIdx) => {
    const updated = [...tasks];
    const wasDone = updated[taskIdx].status === "done";
    updated[taskIdx] = {
      ...updated[taskIdx],
      status: wasDone ? "to_do" : "done",
      ...((!wasDone) ? { completed_by_role: "consultor", completed_at: new Date().toISOString() } : { completed_by_role: null, completed_at: null }),
    };
    setTasks(updated);
    // BUG FIX: livePhases é declarado ABAIXO — construir updatedPhases diretamente
    const updatedPhases = phases.map((p, i) =>
      i === phaseIndex ? { ...p, status, notes, tasks: updated } : p
    );
    await persistPhases(updatedPhases);
  };

  const handleUpdateEvidence = async (taskIdx, data) => {
    const updated = [...tasks];
    const originalTask = updated[taskIdx];
    updated[taskIdx] = { 
      ...originalTask, 
      ...data,
      // Garantir que campos do template NÃO são removidos ao salvar evidência
      instructions: originalTask.instructions,
      link_url: originalTask.link_url,
      video_url: originalTask.video_url,
    };
    setTasks(updated);
    // BUG FIX: livePhases é declarado ABAIXO — construir updatedPhases diretamente
    const updatedPhases = phases.map((p, i) =>
      i === phaseIndex ? { ...p, status, notes, tasks: updated } : p
    );
    await persistPhases(updatedPhases);
    toast.success("Evidência salva!");
  };

  const [newTaskInstructions, setNewTaskInstructions] = useState("");
  const [newTaskLink, setNewTaskLink] = useState("");
  const [newTaskVideoUrl, setNewTaskVideoUrl] = useState("");

  const addTask = async () => {
    if (!newTask.trim()) return;
    try {
      const newTaskObj = {
        description: newTask.trim(),
        status: "to_do",
        instructions: newTaskInstructions.trim() || undefined,
        link_url: newTaskLink.trim() || undefined,
        video_url: newTaskVideoUrl || undefined,
      };
      const updated = [...tasks, newTaskObj];
      // BUGFIX CRÍTICO: setTasks é assíncrono — NÃO usar livePhases aqui pois
      // ele ainda reflete o estado ANTERIOR (antes do setTasks ter efeito).
      // Construir updatedPhases diretamente a partir de `updated` e `phases`.
      const updatedPhases = phases.map((p, i) =>
        i === phaseIndex ? { ...p, status, notes, tasks: updated } : p
      );
      const success = await persistPhases(updatedPhases);
      if (success) {
        setTasks(updated);
        // Limpar campos APENAS após sucesso
        setNewTask("");
        setNewTaskInstructions("");
        setNewTaskLink("");
        setNewTaskVideoUrl("");
      }
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Erro ao adicionar tarefa");
    }
  };

  const removeTask = async (idx) => {
    const updated = tasks.filter((_, i) => i !== idx);
    // Mesmo fix do addTask: construir updatedPhases com `updated` diretamente
    const updatedPhases = phases.map((p, i) =>
      i === phaseIndex ? { ...p, status, notes, tasks: updated } : p
    );
    const success = await persistPhases(updatedPhases);
    if (success) setTasks(updated);
  };

  const canGoBack = phaseIndex > 0;
  const canGoForward = phaseIndex < phases.length - 1;
  const isPendingReview = currentPhase?.status === "pending_review";

  // Build live phases array reflecting local edits for the current phase
  const livePhases = phases.map((p, i) =>
    i === phaseIndex ? { ...p, status, notes, tasks } : p
  );

  return (
    <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div>
              <div className="text-base font-bold">{config.label}</div>
              <div className="text-xs text-gray-500 font-normal">{sprint?.title}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Phase Progress Bar — uses live local state */}
        <SprintPhaseProgress phases={livePhases} />

        {/* Phase Navigation */}
        <div className="flex items-center justify-between py-2 border-b">
          <Button
            variant="ghost" size="sm" disabled={!canGoBack}
            onClick={() => onNavigateToPhase(phaseIndex - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-xs text-gray-500 font-medium">
            Fase {phaseIndex + 1} de {phases.length}
          </span>
          <Button
            variant="ghost" size="sm" disabled={!canGoForward}
            onClick={() => onNavigateToPhase(phaseIndex + 1)}
          >
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Consultant Review Panel (shows only when pending_review) */}
        <ConsultorReviewPanel
          phase={currentPhase || {}}
          onApprove={handleApprovePhase}
          onReturn={handleReturnPhase}
          isSaving={saving}
        />

        {/* Status (consultant can change directly) */}
        {!isPendingReview && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    status === opt.value
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">Observações</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações sobre esta fase..."
            className="h-24 text-sm"
          />
        </div>

        {/* Tasks — reuse shared SprintTaskItem for evidence/completion visibility */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">
            Tarefas ({tasks.filter(t => t.status === "done").length}/{tasks.length})
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tasks.map((task, idx) => (
              <SprintTaskItem
                key={idx}
                task={task}
                index={idx}
                canComplete={true}
                canAddNotes={true}
                userRole="consultor"
                onToggle={handleToggleTask}
                onUpdateEvidence={handleUpdateEvidence}
              />
            ))}
          </div>
          <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="space-y-1.5">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Descreva a nova tarefa e pressione Enter..."
                className="text-sm flex-1 bg-white"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
              />
              <Textarea
                value={newTaskInstructions}
                onChange={(e) => setNewTaskInstructions(e.target.value)}
                placeholder="Como fazer (instruções para a oficina)..."
                className="text-sm bg-white"
                rows={2}
              />
              <Input
                value={newTaskLink}
                onChange={(e) => setNewTaskLink(e.target.value)}
                placeholder="Link material complementar (https://...)..."
                className="text-sm bg-white"
              />
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500">🎬 Vídeo de instrução</span>
                <VideoUploadRecorder
                  videoUrl={newTaskVideoUrl}
                  onVideoSaved={(url) => setNewTaskVideoUrl(url)}
                  onVideoRemoved={() => setNewTaskVideoUrl("")}
                />
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={addTask} 
              disabled={!newTask.trim()} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar Tarefa
            </Button>
          </div>
        </div>

        {/* Completion summary */}
        <SprintCompletionSummary sprint={sprint} />

        {/* Activity timeline */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Histórico</h4>
          <SprintActivityTimeline sprint={sprint} maxItems={6} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}