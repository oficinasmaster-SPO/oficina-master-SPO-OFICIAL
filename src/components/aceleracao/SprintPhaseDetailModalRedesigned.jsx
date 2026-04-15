import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Send,
  ListChecks, PlaySquare, BarChart2, TrendingUp, MessageSquare,
  Plus, Trash2, Save, Loader2
} from "lucide-react";
import SprintPhaseProgress from "./sprint-client/SprintPhaseProgress";
import SprintTaskItem from "./sprint-client/SprintTaskItem";
import ConsultorReviewPanel from "./sprint-consultant/ConsultorReviewPanel";

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
  { value: "pending_review", label: "Aguardando revisão", icon: <Send className="w-4 h-4 text-amber-500" /> },
  { value: "completed", label: "Concluído", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
];

export default function SprintPhaseDetailModalRedesigned({
  sprint,
  phaseIndex = 0,
  onClose,
  onSaved,
  onNavigateToPhase,
  onNavigateToNextSprint,
}) {
  const phases = sprint?.phases || [];
  const currentPhase = phases[phaseIndex];
  const config = PHASES_CONFIG.find(p => p.name === currentPhase?.name) || PHASES_CONFIG[0];
  const Icon = config.icon;

  const [status, setStatus] = useState(currentPhase?.status || "not_started");
  const [notes, setNotes] = useState(currentPhase?.notes || "");
  const [tasks, setTasks] = useState(currentPhase?.tasks || []);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const phase = phases[phaseIndex];
    if (phase) {
      setStatus(phase.status || "not_started");
      setNotes(phase.notes || "");
      setTasks(phase.tasks || []);
    }
  }, [phaseIndex, phases]);

  const persistPhases = async (updatedPhases) => {
    setSaving(true);
    const totalTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
    const doneTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
    const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const allCompleted = updatedPhases.every(p => p.status === "completed");

    try {
      await base44.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: taskProgress,
        status: allCompleted ? "completed" : "in_progress",
        last_activity_date: new Date().toISOString(),
      });
      return true;
    } catch {
      toast.error("Erro ao salvar fase");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const updatedPhases = [...phases];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status,
      notes,
      tasks,
      ...(status === "completed" ? { completion_date: new Date().toISOString() } : {}),
    };
    const ok = await persistPhases(updatedPhases);
    if (ok) {
      toast.success("Fase atualizada!");
      if (canGoForward) {
        onNavigateToPhase(phaseIndex + 1);
      } else {
        if (onSaved) onSaved();
      }
    }
  };

  // Review actions for consultant
  const handleApprovePhase = async (feedback) => {
    const updatedPhases = [...phases];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status: "completed",
      completion_date: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      review_feedback: feedback || "",
    };
    const ok = await persistPhases(updatedPhases);
    if (ok) {
      toast.success("Fase aprovada!");
      if (canGoForward) onNavigateToPhase(phaseIndex + 1);
      else if (onSaved) onSaved();
    }
  };

  const handleReturnPhase = async (feedback) => {
    const updatedPhases = [...phases];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status: "in_progress",
      reviewed_at: new Date().toISOString(),
      review_feedback: feedback,
    };
    const ok = await persistPhases(updatedPhases);
    if (ok) toast.success("Fase devolvida para a oficina com feedback.");
  };

  const handleToggleTask = (taskIdx) => {
    const updated = [...tasks];
    updated[taskIdx] = {
      ...updated[taskIdx],
      status: updated[taskIdx].status === "done" ? "to_do" : "done",
      ...(updated[taskIdx].status !== "done" ? { completed_by_role: "consultor", completed_at: new Date().toISOString() } : { completed_by_role: null, completed_at: null }),
    };
    setTasks(updated);
  };

  const handleUpdateEvidence = (taskIdx, data) => {
    const updated = [...tasks];
    updated[taskIdx] = { ...updated[taskIdx], ...data };
    setTasks(updated);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { description: newTask.trim(), status: "to_do" }]);
    setNewTask("");
  };

  const removeTask = (idx) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const canGoBack = phaseIndex > 0;
  const canGoForward = phaseIndex < phases.length - 1;
  const isPendingReview = currentPhase?.status === "pending_review";

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

        {/* Phase Progress Bar */}
        <SprintPhaseProgress phases={phases} />

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
          <div className="flex gap-2">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nova tarefa..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <Button size="sm" variant="outline" onClick={addTask} disabled={!newTask.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
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