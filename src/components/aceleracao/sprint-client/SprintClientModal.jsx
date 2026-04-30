import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, StickyNote, AlertCircle, ClipboardList, Zap, Eye, Star, RotateCcw, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSprintPermissions } from "@/components/hooks/useSprintPermissions";
import SprintPhaseProgress from "./SprintPhaseProgress";
import SprintTaskItem from "./SprintTaskItem";
import SprintSubmitReview from "./SprintSubmitReview";
import SprintActivityTimeline from "../sprint-shared/SprintActivityTimeline";
import SprintCompletionSummary from "../sprint-shared/SprintCompletionSummary";

const phaseNames = ["Planning", "Execution", "Monitoring", "Review", "Retrospective"];
const phaseLabels = { Planning: "Planejamento", Execution: "Execução", Monitoring: "Monitoramento", Review: "Revisão", Retrospective: "Retrospectiva" };
const phaseIcons = { Planning: ClipboardList, Execution: Zap, Monitoring: Eye, Review: Star, Retrospective: RotateCcw };

export default function SprintClientModal({ sprint, user, workshop, open, onClose }) {
  const queryClient = useQueryClient();
  const permissions = useSprintPermissions(sprint, user, workshop);
  const sprintCompleted = sprint?.status === "completed";
  const savingRef = React.useRef(false); // Guard contra saves concorrentes

  // Estado local de phases para evitar stale closure nos handlers de save
  const [localPhases, setLocalPhases] = useState(sprint?.phases || []);

  // Sincronizar localPhases quando abre sprint diferente OU quando o conteúdo do sprint muda no banco
  // updated_date muda toda vez que o backend atualiza o sprint (ex: sync de template com novo video_url)
  useEffect(() => {
    if (sprint?.phases) {
      setLocalPhases(sprint.phases);
    }
  }, [sprint?.id, sprint?.updated_date]);

  const phases = localPhases;
  
  // Start on the first non-completed phase
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState(null); // 'left' | 'right'
  const [isAnimating, setIsAnimating] = useState(false);
  const phase = phases[currentPhaseIdx] || {};
  const tasks = phase.tasks || [];
  const allTasksDone = tasks.length > 0 && tasks.every(t => t.status === "done");

  // Reset to first non-completed phase when sprint changes
  React.useEffect(() => {
    if (sprint?.id) {
      const idx = Math.max(0, phases.findIndex(p => p.status !== "completed"));
      setCurrentPhaseIdx(idx);
    }
  }, [sprint?.id]);

  const animationTimerRef = React.useRef(null);
  const navigatePhase = (direction) => {
    const nextIdx = direction === "next" ? currentPhaseIdx + 1 : currentPhaseIdx - 1;
    if (nextIdx < 0 || nextIdx >= phases.length) return;
    setSlideDirection(direction === "next" ? "left" : "right");
    setIsAnimating(true);
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    animationTimerRef.current = setTimeout(() => {
      setCurrentPhaseIdx(nextIdx);
      setIsAnimating(false);
    }, 200);
  };

  // Cleanup timers on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (updatedPhases) => {
      // Guard: descartar save se já há um em andamento (evita writes concorrentes)
      if (savingRef.current) return;
      savingRef.current = true;
      // Atualizar estado local imediatamente (optimistic update)
      setLocalPhases(updatedPhases);

      const totalTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
      const doneTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      await base44.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: progress,
        last_activity_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      savingRef.current = false;
      // Invalidar query principal imediatamente; demais com delay para evitar 429
      queryClient.invalidateQueries({ queryKey: ["sprints-client"], exact: false });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["active-sprint-widget"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["dashboard-sprints"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["sprints-reais"], exact: false });
      }, 1500);
      // Nota: setTimeout acima é fire-and-forget (queryClient é estável), sem risco de leak
    },
    onError: () => {
      savingRef.current = false;
      // Rollback: ressincronizar com dado do banco
      if (sprint?.phases) setLocalPhases(sprint.phases);
      queryClient.invalidateQueries({ queryKey: ["sprints-client"], exact: false });
      toast.error("Erro ao salvar. Tente novamente.");
    },
  });

  const handleToggleTask = (taskIdx) => {
    const updated = [...phases];
    // Auto-start phase if it's not_started
    if (updated[currentPhaseIdx].status === "not_started") {
      updated[currentPhaseIdx] = { ...updated[currentPhaseIdx], status: "in_progress" };
    }
    const originalTask = updated[currentPhaseIdx].tasks[taskIdx];
    const wasDone = originalTask.status === "done";
    const task = {
      ...originalTask,
      status: wasDone ? "to_do" : "done",
      completed_by: wasDone ? null : user.id,
      completed_by_role: wasDone ? null : permissions.role,
      completed_at: wasDone ? null : new Date().toISOString(),
      // Garantir que campos do template nunca são perdidos no toggle
      instructions: originalTask.instructions,
      link_url: originalTask.link_url,
      video_url: originalTask.video_url,
    };
    updated[currentPhaseIdx] = { ...updated[currentPhaseIdx], tasks: updated[currentPhaseIdx].tasks.map((t, i) => i === taskIdx ? task : t) };
    saveMutation.mutate(updated);
  };

  const handleUpdateEvidence = (taskIdx, data) => {
    const updated = [...phases];
    const originalTask = updated[currentPhaseIdx].tasks[taskIdx];
    const task = { 
      ...originalTask, 
      ...data,
      // Garantir que campos do template NÃO são removidos ao salvar evidência
      instructions: originalTask.instructions,
      link_url: originalTask.link_url,
      video_url: originalTask.video_url,
    };
    updated[currentPhaseIdx] = { ...updated[currentPhaseIdx], tasks: updated[currentPhaseIdx].tasks.map((t, i) => i === taskIdx ? task : t) };
    saveMutation.mutate(updated);
    toast.success("Evidência salva!");
  };

  const handleUpdateNotes = (notes) => {
    const updated = [...phases];
    updated[currentPhaseIdx] = { ...updated[currentPhaseIdx], notes };
    saveMutation.mutate(updated);
  };

  const handleSubmitForReview = async () => {
    const updated = [...phases];
    const now = new Date().toISOString();
    const existingHistory = updated[currentPhaseIdx].review_history || [];
    updated[currentPhaseIdx] = {
      ...updated[currentPhaseIdx],
      status: "pending_review",
      submitted_for_review_at: now,
      submitted_for_review_by: user.id,
      review_history: [
        ...existingHistory,
        { action: "submitted", date: now, actor: "oficina", actor_id: user.id },
      ],
    };
    saveMutation.mutate(updated);
    toast.success("Fase enviada para revisão do consultor!");

    // Fire-and-forget notification
    base44.functions.invoke("notifySprintPhaseChange", {
      sprint_id: sprint.id,
      phase_name: phase.name,
      action: "submitted_for_review",
    }).catch(() => {});
  };

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(phase.notes || "");

  // Sync notes when phase changes
  React.useEffect(() => {
    setNotesValue(phase.notes || "");
    setEditingNotes(false);
  }, [currentPhaseIdx, phase.notes]);

  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = React.useRef(null);

  const handleClose = () => {
    // Guard: não fechar durante save em andamento para evitar perda de dados
    if (savingRef.current) return;
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 350);
  };

  // Cleanup close timer on unmount
  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!sprint) return null;

  const PhaseIcon = phaseIcons[phase.name] || ClipboardList;

  const statusBadgeStyles = {
    not_started: "bg-gray-100 text-gray-600 border-gray-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-green-50 text-green-700 border-green-200",
  };

  const statusLabels = {
    not_started: "Não iniciada",
    in_progress: "Em andamento",
    pending_review: "Aguardando revisão",
    completed: "Concluída",
  };

  return (
    <Dialog open={open && !isClosing} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className={cn(
          "max-w-[100vw] w-screen h-screen max-h-screen rounded-none p-0 flex flex-col overflow-hidden origin-center transition-transform duration-300 ease-in-out",
          isClosing ? "scale-y-0 opacity-0" : "scale-y-100 opacity-100"
        )}
        hideClose
      >
        {/* ═══ FIXED HEADER ═══ */}
        <div className="shrink-0 bg-white z-10 relative">
          {/* Title + Close — elevated card */}
          <div className="mx-4 mt-4 mb-3 bg-white rounded-xl shadow-md border border-gray-100 px-5 py-4 flex items-start justify-between gap-4">
            <DialogHeader className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-gray-900">{sprint.title}</DialogTitle>
              {sprint.objective && <p className="text-sm text-gray-500 mt-0.5">{sprint.objective}</p>}
            </DialogHeader>
            <button
              onClick={handleClose}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 active:scale-90"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Phase progress bar */}
          <div className="px-5">
            <SprintPhaseProgress phases={phases} currentPhaseIdx={currentPhaseIdx} onPhaseClick={(idx) => {
              if (idx === currentPhaseIdx) return;
              setSlideDirection(idx > currentPhaseIdx ? "left" : "right");
              setIsAnimating(true);
              setTimeout(() => { setCurrentPhaseIdx(idx); setIsAnimating(false); }, 200);
            }} />
          </div>

          {/* Phase navigation bar */}
          <div className="flex items-center justify-between px-5 py-3">
            <Button
              variant="outline" size="sm"
              disabled={currentPhaseIdx === 0}
              onClick={() => navigatePhase("prev")}
              className={cn(
                "gap-1.5 transition-all duration-200 border-gray-200",
                currentPhaseIdx === 0 ? "opacity-40" : "hover:bg-gray-100 hover:border-gray-300 active:scale-95"
              )}
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <div className="text-center flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <PhaseIcon className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-gray-900 text-base">{phaseLabels[phase.name] || phase.name}</p>
              </div>
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full border font-medium", statusBadgeStyles[phase.status] || statusBadgeStyles.not_started)}>
                {statusLabels[phase.status] || "Não iniciada"}
              </span>
            </div>
            <Button
              variant="outline" size="sm"
              disabled={currentPhaseIdx === phases.length - 1}
              onClick={() => navigatePhase("next")}
              className={cn(
                "gap-1.5 transition-all duration-200 border-gray-200",
                currentPhaseIdx === phases.length - 1 ? "opacity-40" : "hover:bg-gray-100 hover:border-gray-300 active:scale-95"
              )}
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Glow divider */}
          <div className="relative h-[6px] mt-1">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
            <div className="absolute inset-x-[10%] top-0 h-[3px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent blur-sm" />
            <div className="absolute inset-x-[20%] top-[1px] h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-md" />
          </div>
        </div>

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div
            className={cn(
              "transition-all duration-200 ease-in-out",
              isAnimating && slideDirection === "left" && "opacity-0 -translate-x-6",
              isAnimating && slideDirection === "right" && "opacity-0 translate-x-6",
              !isAnimating && "opacity-100 translate-x-0"
            )}
          >
            {/* Consultant feedback banner */}
            {phase.review_feedback && phase.status === "in_progress" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 rounded-full p-1.5 mt-0.5 shrink-0">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Fase devolvida pelo Consultor</p>
                    <p className="text-sm text-orange-800 mt-1">{phase.review_feedback}</p>
                    {phase.reviewed_at && (
                      <p className="text-xs text-orange-600 mt-2">
                        Devolvida em {new Date(phase.reviewed_at).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    <p className="text-xs text-orange-700 mt-2 font-medium">
                      Corrija os pontos indicados e reenvie para revisão.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="space-y-2 mt-2">
              <h4 className="text-sm font-semibold text-gray-700">
                Tarefas ({tasks.filter(t => t.status === "done").length}/{tasks.length})
              </h4>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma tarefa nesta fase.</p>
              ) : (
                tasks.map((task, idx) => (
                  <SprintTaskItem
                    key={`${currentPhaseIdx}-${idx}`}
                    task={task}
                    index={idx}
                    canComplete={(phase.status === "in_progress" || phase.status === "not_started") && !sprintCompleted}
                    canAddNotes={(phase.status === "in_progress" || phase.status === "not_started") && !sprintCompleted}
                    userRole={permissions.role}
                    onToggle={handleToggleTask}
                    onUpdateEvidence={handleUpdateEvidence}
                  />
                ))
              )}
            </div>

            {/* Notes section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <StickyNote className="w-4 h-4" /> Notas da Fase
                </h4>
                {(phase.status === "in_progress" || phase.status === "not_started") && !sprintCompleted && !editingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                    Editar
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Observações, anotações..."
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Cancelar</Button>
                    <Button size="sm" onClick={() => { handleUpdateNotes(notesValue); setEditingNotes(false); }}>
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{phase.notes || "Sem notas."}</p>
              )}
            </div>

            {/* Submit for review */}
            <SprintSubmitReview
              phase={phase}
              canSubmit={permissions.canSubmitForReview}
              allTasksDone={allTasksDone}
              onSubmit={handleSubmitForReview}
              isSubmitting={saveMutation.isPending}
              hideFeedback={!!(phase.review_feedback && phase.status === "in_progress")}
            />

            {/* Completion summary */}
            <SprintCompletionSummary sprint={sprint} />

            {/* Activity timeline */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Atividades</h4>
              <SprintActivityTimeline sprint={sprint} maxItems={8} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}