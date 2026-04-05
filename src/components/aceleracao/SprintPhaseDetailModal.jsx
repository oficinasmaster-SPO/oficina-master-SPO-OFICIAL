import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Plus, Trash2, Save, BarChart2, ListChecks } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATUS_FASE = {
  not_started: { label: "Não iniciada", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700" },
};

const DEFAULT_TASKS_AGENDA_CHEIA = [
  { description: "Levantar a base de clientes dos últimos 12 meses", status: "to_do" },
  { description: "Filtrar clientes com mais de 90 dias sem retorno", status: "to_do" },
  { description: "Classificar clientes por recorrência (recorrentes vs não-recorrentes)", status: "to_do" },
  { description: "Definir oferta de reativação (Kit Master ou equivalente)", status: "to_do" },
  { description: "Definir responsável pela execução (SDR/Vendedor)", status: "to_do" },
  { description: "Validar capacitação dos treinamentos", status: "to_do" },
];

const DEFAULT_KPIS_AGENDA_CHEIA = [
  { name: "Clientes da base em trabalho", value: 0, unit: "qtd" },
  { name: "Clientes com +90 dias sem retorno", value: 0, unit: "qtd" },
  { name: "Capacidade de atendimento disponível", value: 0, unit: "horas" },
];

export default function SprintPhaseDetailModal({ sprint, phaseIndex, onClose, onSaved }) {
  const phase = sprint?.phases?.[phaseIndex];
  const [status, setStatus] = useState(phase?.status || "not_started");
  const [notes, setNotes] = useState(phase?.notes || "");
  const [dueDate, setDueDate] = useState(phase?.due_date || "");
  const [saving, setSaving] = useState(false);

  // Inicializa tarefas com padrão se for Planning de Agenda Cheia
  const isAgendaCheia = sprint?.mission_id === 'agenda_cheia' && phase?.name === 'Planning';
  const initTasks = phase?.tasks && phase.tasks.length > 0 ? phase.tasks : (isAgendaCheia ? DEFAULT_TASKS_AGENDA_CHEIA : []);
  const [tasks, setTasks] = useState(initTasks);

  // Inicializa KPIs com padrão se for Planning de Agenda Cheia
  const initMetrics = phase?.metrics && phase.metrics.length > 0 ? phase.metrics : (isAgendaCheia ? DEFAULT_KPIS_AGENDA_CHEIA : []);
  const [metrics, setMetrics] = useState(initMetrics);

  if (!sprint || !phase) return null;

  const addMetric = () => setMetrics(prev => [...prev, { name: "", value: 0, unit: "" }]);
  const updateMetric = (idx, field, val) => setMetrics(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const removeMetric = (idx) => setMetrics(prev => prev.filter((_, i) => i !== idx));

  const addTask = () => setTasks(prev => [...prev, { description: "", status: "to_do" }]);
  const toggleTask = (idx) => setTasks(prev => prev.map((t, i) => i === idx ? { ...t, status: t.status === "done" ? "to_do" : "done" } : t));
  const updateTaskDesc = (idx, val) => setTasks(prev => prev.map((t, i) => i === idx ? { ...t, description: val } : t));
  const removeTask = (idx) => setTasks(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    const updatedPhases = [...(sprint.phases || [])];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status,
      notes,
      due_date: dueDate || null,
      completion_date: status === "completed" ? (phase.completion_date || new Date().toISOString()) : null,
      metrics,
      tasks,
    };

    // Calcular progresso: combina conclusão de fases + tarefas
    const totalTasks = updatedPhases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
    const doneTasks = updatedPhases.reduce((acc, p) => acc + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
    const phasesCompleted = updatedPhases.filter(p => p.status === "completed").length;

    let progress;
    if (totalTasks > 0) {
      // Combina: 50% peso fases + 50% peso tarefas
      const phaseProgress = Math.round((phasesCompleted / updatedPhases.length) * 50);
      const taskProgress = Math.round((doneTasks / totalTasks) * 50);
      progress = phaseProgress + taskProgress;
    } else {
      // Só fases
      progress = Math.round((phasesCompleted / updatedPhases.length) * 100);
    }

    const newSprintStatus = phasesCompleted === updatedPhases.length
      ? "completed"
      : phasesCompleted > 0 || doneTasks > 0
        ? "in_progress"
        : sprint.status === "overdue" ? "overdue" : "pending";

    try {
      await base44.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: progress,
        status: newSprintStatus,
        last_activity_date: new Date().toISOString(),
      });
      toast.success('✓ Fase salva com sucesso!');
    } catch (error) {
      toast.error('✗ Erro ao salvar fase');
      console.error('Erro ao salvar fase:', error);
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const phaseName = phase.name;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phaseName}
            <Badge className={STATUS_FASE[status].color}>{STATUS_FASE[status].label}</Badge>
          </DialogTitle>
          <p className="text-xs text-gray-500">Sprint: {sprint.title}</p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Status da Fase</Label>
            <div className="flex gap-2">
              {Object.entries(STATUS_FASE).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border-2 transition-all ${
                    status === key ? "border-current ring-2 ring-offset-1 ring-blue-400 " + val.color : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data prevista */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Data Prevista</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Anotações do Consultor</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Registre observações, decisões e pontos importantes desta fase..."
              className="text-sm min-h-[80px]"
            />
          </div>

          {/* Tarefas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5" /> Tarefas
              </Label>
              <button onClick={addTask} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button onClick={() => toggleTask(idx)}>
                    {task.status === "done"
                      ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                  </button>
                  <Input
                    value={task.description}
                    onChange={e => updateTaskDesc(idx, e.target.value)}
                    placeholder="Descrição da tarefa..."
                    className={`text-sm flex-1 h-8 ${task.status === "done" ? "line-through text-gray-400" : ""}`}
                  />
                  <button onClick={() => removeTask(idx)} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nenhuma tarefa. Clique em "+ Adicionar" para criar.</p>
              )}
            </div>
          </div>

          {/* Métricas/KPIs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" /> Indicadores / KPIs
              </Label>
              <button onClick={addMetric} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {metrics.map((metric, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={metric.name}
                    onChange={e => updateMetric(idx, "name", e.target.value)}
                    placeholder="Indicador (ex: Ticket Médio)"
                    className="text-sm h-8 flex-1"
                  />
                  <Input
                    type="number"
                    value={metric.value}
                    onChange={e => updateMetric(idx, "value", parseFloat(e.target.value) || 0)}
                    placeholder="Valor"
                    className="text-sm h-8 w-24"
                  />
                  <Input
                    value={metric.unit}
                    onChange={e => updateMetric(idx, "unit", e.target.value)}
                    placeholder="Un."
                    className="text-sm h-8 w-16"
                  />
                  <button onClick={() => removeMetric(idx)} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {metrics.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nenhum indicador registrado ainda.</p>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Fase"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}