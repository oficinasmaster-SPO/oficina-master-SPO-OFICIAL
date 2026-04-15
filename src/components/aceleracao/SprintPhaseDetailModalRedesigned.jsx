import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock,
  ListChecks, PlaySquare, BarChart2, TrendingUp, MessageSquare,
  Plus, Trash2, Save, Loader2
} from "lucide-react";

const PHASES_CONFIG = [
  { name: "Planning", label: "Sprint Planning", icon: ListChecks, color: "text-blue-600", bg: "bg-blue-50" },
  { name: "Execution", label: "Execução", icon: PlaySquare, color: "text-green-600", bg: "bg-green-50" },
  { name: "Monitoring", label: "Checkpoint", icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
  { name: "Review", label: "Sprint Review", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  { name: "Retrospective", label: "Retrospectiva", icon: MessageSquare, color: "text-red-600", bg: "bg-red-50" },
];


export default function SprintPhaseDetailModalRedesigned({
  sprint,
  phaseIndex = 0,
  onClose,
  onSaved,
  onNavigateToPhase,
}) {
  const phases = sprint?.phases || [];
  const currentPhase = phases[phaseIndex];
  const config = PHASES_CONFIG.find(p => p.name === currentPhase?.name) || PHASES_CONFIG[0];
  const Icon = config.icon;

  const [notes, setNotes] = useState(currentPhase?.notes || "");
  const [tasks, setTasks] = useState(currentPhase?.tasks || []);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const phase = phases[phaseIndex];
    if (phase) {
      setNotes(phase.notes || "");
      setTasks(phase.tasks || []);
    }
  }, [phaseIndex, phases]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const updatedPhases = [...phases];
      const total = updatedPhases.length;
      const isLastPhase = phaseIndex === total - 1;

      // 1. Marcar fase atual como concluída
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        status: "completed",
        notes,
        tasks,
        completion_date: new Date().toISOString(),
      };

      // 2. Se não for última, iniciar próxima fase
      if (!isLastPhase) {
        updatedPhases[phaseIndex + 1] = {
          ...updatedPhases[phaseIndex + 1],
          status: "in_progress",
        };
      }

      // 3. Calcular progresso
      const completedCount = updatedPhases.filter(p => p.status === "completed").length;
      const progress = Math.round((completedCount / total) * 100);

      // 4. Regra de consistência: apenas 1 fase em andamento
      const activePhases = updatedPhases.filter(p => p.status === "in_progress");
      if (activePhases.length > 1) {
        throw new Error("Mais de uma fase em andamento detectada");
      }

      // 5. Salvar sprint
      await base44.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: progress,
        status: isLastPhase ? "completed" : "in_progress",
        last_activity_date: new Date().toISOString(),
      });

      toast.success("Fase salva com sucesso!");

      if (onSaved) onSaved();

      // 6. Controle de fluxo: avança ou fecha
      if (!isLastPhase) {
        onNavigateToPhase(phaseIndex + 1);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar fase");
    } finally {
      setSaving(false);
    }
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { description: newTask.trim(), status: "to_do" }]);
    setNewTask("");
  };

  const toggleTask = (idx) => {
    const updated = [...tasks];
    updated[idx] = {
      ...updated[idx],
      status: updated[idx].status === "done" ? "to_do" : "done",
    };
    setTasks(updated);
  };

  const removeTask = (idx) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const canGoBack = phaseIndex > 0;
  const canGoForward = phaseIndex < phases.length - 1;

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

        {/* Status badge (read-only, controlado pelo fluxo) */}
        <div className="flex items-center gap-2 py-1">
          {currentPhase?.status === "completed" ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
            </span>
          ) : currentPhase?.status === "in_progress" ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              <Clock className="w-3.5 h-3.5" /> Em andamento
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Circle className="w-3.5 h-3.5" /> Pendente
            </span>
          )}
        </div>

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

        {/* Tasks */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">
            Tarefas ({tasks.filter(t => t.status === "done").length}/{tasks.length})
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <button onClick={() => toggleTask(idx)}>
                  {task.status === "done"
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <Circle className="w-4 h-4 text-gray-300" />}
                </button>
                <span className={`text-sm flex-1 ${task.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>
                  {task.description}
                </span>
                <button
                  onClick={() => removeTask(idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                </button>
              </div>
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
            {canGoForward ? "Salvar e Avançar" : "Salvar e Fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}