import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Rocket } from "lucide-react";

const DEFAULT_PHASES = [
  { name: "Planning", status: "not_started", tasks: [] },
  { name: "Execution", status: "not_started", tasks: [] },
  { name: "Monitoring", status: "not_started", tasks: [] },
  { name: "Review", status: "not_started", tasks: [] },
  { name: "Retrospective", status: "not_started", tasks: [] },
];

export default function SprintCreateForm({ open, onClose, workshops = [], user, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    workshop_id: "",
    title: "",
    objective: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    sprint_number: 1,
  });

  // Per-phase tasks editing
  const [phaseTasks, setPhaseTasks] = useState(
    DEFAULT_PHASES.map(() => [])
  );
  const [newTaskTexts, setNewTaskTexts] = useState(DEFAULT_PHASES.map(() => ""));

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addTask = (phaseIdx) => {
    const text = newTaskTexts[phaseIdx]?.trim();
    if (!text) return;
    const updated = [...phaseTasks];
    updated[phaseIdx] = [...updated[phaseIdx], { description: text, status: "to_do" }];
    setPhaseTasks(updated);
    const newTexts = [...newTaskTexts];
    newTexts[phaseIdx] = "";
    setNewTaskTexts(newTexts);
  };

  const removeTask = (phaseIdx, taskIdx) => {
    const updated = [...phaseTasks];
    updated[phaseIdx] = updated[phaseIdx].filter((_, i) => i !== taskIdx);
    setPhaseTasks(updated);
  };

  const handleSubmit = async () => {
    if (!form.workshop_id || !form.title || !form.start_date || !form.end_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    const phases = DEFAULT_PHASES.map((p, idx) => ({
      ...p,
      tasks: phaseTasks[idx],
    }));

    const workshop = workshops.find(w => w.id === form.workshop_id);

    await base44.entities.ConsultoriaSprint.create({
      ...form,
      mission_id: "custom",
      phases,
      status: "pending",
      progress_percentage: 0,
      consulting_firm_id: user?.data?.consulting_firm_id || "",
      consultor_id: user?.id || "",
    });

    toast.success(`Sprint criado para ${workshop?.name || "cliente"}!`);
    setSaving(false);
    onCreated?.();
    onClose();

    // Reset form
    setForm({
      workshop_id: "",
      title: "",
      objective: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      sprint_number: 1,
    });
    setPhaseTasks(DEFAULT_PHASES.map(() => []));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-orange-600" />
            Criar Sprint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workshop selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Cliente *</Label>
            <Select value={form.workshop_id} onValueChange={(v) => updateField("workshop_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {workshops.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Título do Sprint *</Label>
            <Input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Ex: Sprint 1 — Fechamento Imbatível"
            />
          </div>

          {/* Objective */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Objetivo</Label>
            <Textarea
              value={form.objective}
              onChange={(e) => updateField("objective", e.target.value)}
              placeholder="Meta mensurável deste sprint..."
              rows={2}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data Início *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data Fim *</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
              />
            </div>
          </div>

          {/* Sprint Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Número do Sprint</Label>
            <Input
              type="number"
              min={0}
              value={form.sprint_number}
              onChange={(e) => updateField("sprint_number", parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Phase tasks */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-bold text-gray-700">Tarefas por Fase (opcional)</p>
            {DEFAULT_PHASES.map((phase, phaseIdx) => (
              <div key={phase.name} className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">{phase.name}</p>
                {phaseTasks[phaseIdx].map((task, taskIdx) => (
                  <div key={taskIdx} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-gray-700 truncate">{task.description}</span>
                    <button onClick={() => removeTask(phaseIdx, taskIdx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input
                    value={newTaskTexts[phaseIdx]}
                    onChange={(e) => {
                      const t = [...newTaskTexts];
                      t[phaseIdx] = e.target.value;
                      setNewTaskTexts(t);
                    }}
                    placeholder="Nova tarefa..."
                    className="text-xs h-8"
                    onKeyDown={(e) => e.key === "Enter" && addTask(phaseIdx)}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addTask(phaseIdx)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Rocket className="w-4 h-4 mr-1" />}
              Criar Sprint
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}