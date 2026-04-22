import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, StickyNote, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSprintPermissions } from "@/components/hooks/useSprintPermissions";
import SprintPhaseProgress from "./SprintPhaseProgress";
import SprintTaskItem from "./SprintTaskItem";
import SprintSubmitReview from "./SprintSubmitReview";
import SprintActivityTimeline from "../sprint-shared/SprintActivityTimeline";
import SprintCompletionSummary from "../sprint-shared/SprintCompletionSummary";

const phaseNames = ["Planning", "Execution", "Monitoring", "Review", "Retrospective"];
const phaseLabels = { Planning: "Planejamento", Execution: "Execução", Monitoring: "Monitoramento", Review: "Revisão", Retrospective: "Retrospectiva" };

export default function SprintClientModal({ sprint, user, workshop, open, onClose }) {
  const queryClient = useQueryClient();
  const permissions = useSprintPermissions(sprint, user, workshop);
  const sprintCompleted = sprint?.status === "completed";

  // Estado local de phases para evitar stale closure nos handlers de save
  const [localPhases, setLocalPhases] = useState(sprint?.phases || []);

  // Sincronizar localPhases APENAS quando abre um sprint diferente (sprint.id muda)
  // Não sincronizar a cada refetch para evitar sobrescrever dados locais não persistidos ainda
  useEffect(() => {
    if (sprint?.phases) {
      setLocalPhases(sprint.phases);
    }
  }, [sprint?.id]);

  const phases = localPhases;
  
  // Start on the first non-completed phase
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
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

  const saveMutation = useMutation({
    mutationFn: async (updatedPhases) => {
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
      queryClient.invalidateQueries({ queryKey: ["sprints-client"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["active-sprint-widget"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["dashboard-sprints"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["sprints-reais"], exact: false });
    },
    onError: () => {
      // Rollback: ressincronizar com dado do banco
      if (sprint?.phases) setLocalPhases(sprint.phases);
      queryClient.invalidateQueries({ queryKey: ["sprints-client"] });
      queryClient.invalidateQueries({ queryKey: ["client-sprints"] });
      toast.error("Erro ao salvar. Tente novamente.");
    },
  });

  const handleToggleTask = (taskIdx) => {
    const updated = [...phases];
    // Auto-start phase if it's not_started
    if (updated[currentPhaseIdx].status === "not_started") {
      updated[currentPhaseIdx] = { ...updated[currentPhaseIdx], status: "in_progress" };
    }
    const task = { ...updated[currentPhaseIdx].tasks[taskIdx] };
    const wasDone = task.status === "done";
    task.status = wasDone ? "to_do" : "done";
    if (!wasDone) {
      task.completed_by = user.id;
      task.completed_by_role = permissions.role;
      task.completed_at = new Date().toISOString();
    } else {
      task.completed_by = null;
      task.completed_by_role = null;
      task.completed_at = null;
    }
    updated[currentPhaseIdx] = { ...updated[currentPhaseIdx], tasks: updated[currentPhaseIdx].tasks.map((t, i) => i === taskIdx ? task : t) };
    saveMutation.mutate(updated);
  };

  const handleUpdateEvidence = (taskIdx, data) => {
    const updated = [...phases];
    const originalTask = updated[currentPhaseIdx].tasks[taskIdx];
    const task = { 
      ...originalTask, 
      ...data,
      // Garantir que instruções e link_url NÃO são removidas
      instructions: originalTask.instructions,
      link_url: originalTask.link_url
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

  if (!sprint) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{sprint.title}</DialogTitle>
          {sprint.objective && <p className="text-sm text-gray-500">{sprint.objective}</p>}
        </DialogHeader>

        {/* Phase progress bar */}
        <SprintPhaseProgress phases={phases} />

        {/* Phase navigation */}
        <div className="flex items-center justify-between border-b pb-3">
          <Button
            variant="ghost" size="sm"
            disabled={currentPhaseIdx === 0}
            onClick={() => setCurrentPhaseIdx(currentPhaseIdx - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <div className="text-center">
            <p className="font-semibold">{phaseLabels[phase.name] || phase.name}</p>
            <Badge variant="outline" className="text-xs mt-1">
              {phase.status === "not_started" && "Não iniciada"}
              {phase.status === "in_progress" && "Em andamento"}
              {phase.status === "pending_review" && "Aguardando revisão"}
              {phase.status === "completed" && "Concluída"}
            </Badge>
          </div>
          <Button
            variant="ghost" size="sm"
            disabled={currentPhaseIdx === phases.length - 1}
            onClick={() => setCurrentPhaseIdx(currentPhaseIdx + 1)}
          >
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Consultant feedback banner - shown prominently when phase was returned
             NOTE: SprintSubmitReview also shows feedback inline, so we only show this 
             prominent banner and suppress the one inside SprintSubmitReview via prop */}
        {phase.review_feedback && phase.status === "in_progress" && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
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
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Tarefas ({tasks.filter(t => t.status === "done").length}/{tasks.length})
          </h4>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma tarefa nesta fase.</p>
          ) : (
            tasks.map((task, idx) => (
              <SprintTaskItem
                key={idx}
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
        <div className="border-t pt-3">
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
        <div className="border-t pt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Atividades</h4>
          <SprintActivityTimeline sprint={sprint} maxItems={8} />
        </div>
      </DialogContent>
    </Dialog>
  );
}