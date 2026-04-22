import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Rocket, BookOpen } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const DEFAULT_PHASES = [
  { name: "Planning", status: "not_started", tasks: [] },
  { name: "Execution", status: "not_started", tasks: [] },
  { name: "Monitoring", status: "not_started", tasks: [] },
  { name: "Review", status: "not_started", tasks: [] },
  { name: "Retrospective", status: "not_started", tasks: [] },
];

const MISSION_OPTIONS = [
  { id: 'sprint0',              icon: '🔍', name: 'Diagnóstico e Alinhamento' },
  { id: 'agenda_cheia',         icon: '📅', name: 'Agenda Cheia' },
  { id: 'fechamento_imbativel', icon: '🎯', name: 'Fechamento Imbatível' },
  { id: 'caixa_forte',          icon: '💰', name: 'Caixa Forte' },
  { id: 'empresa_organizada',   icon: '📊', name: 'Empresa Organizada' },
  { id: 'funcoes_claras',       icon: '👥', name: 'Funções Claras' },
  { id: 'contratacao_certa',    icon: '🎓', name: 'Contratação Certa' },
  { id: 'cultura_forte',        icon: '🌟', name: 'Cultura Forte' },
];

export default function SprintCreateForm({ open, onClose, workshops = [], user, onCreated }) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    workshop_id: "",
    cronograma_template_id: "",
    mission_id: "",
    title: "",
    objective: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    sprint_number: 1,
  });

  // Buscar trilhas disponíveis
  const { data: trilhas = [] } = useQuery({
    queryKey: ['cronograma-templates-sprint-form'],
    queryFn: () => base44.entities.CronogramaTemplate.filter({ ativo: true }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  // Buscar templates salvos na Consultoria Global
  const { data: sprintTemplatesData } = useQuery({
    queryKey: ['sprint-templates-global'],
    queryFn: () => base44.functions.invoke('getSprintTemplates', {}),
    staleTime: 2 * 60 * 1000,
    enabled: open,
  });
  const savedTemplates = sprintTemplatesData?.data?.templates || null;

  // Per-phase tasks editing
  const [phaseTasks, setPhaseTasks] = useState(DEFAULT_PHASES.map(() => []));
  const [newTaskTexts, setNewTaskTexts] = useState(DEFAULT_PHASES.map(() => ""));
  const [templateApplied, setTemplateApplied] = useState(false);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const [newTaskInstructions, setNewTaskInstructions] = useState(DEFAULT_PHASES.map(() => ""));
  const [newTaskLinks, setNewTaskLinks] = useState(DEFAULT_PHASES.map(() => ""));

  // Quando selecionar uma missão, pré-popular tarefas do template salvo na Consultoria Global
  useEffect(() => {
    if (!form.mission_id || !savedTemplates) return;
    const missionTemplate = savedTemplates.find(t => t.mission_id === form.mission_id);
    if (!missionTemplate?.sprint?.phases) return;

    const loadedTasks = DEFAULT_PHASES.map((phase) => {
      const templatePhase = missionTemplate.sprint.phases.find(p => p.name === phase.name);
      return (templatePhase?.tasks || []).map(t => ({
        description: t.description || '',
        status: 'to_do',
        instructions: t.instructions || undefined,
        link_url: t.link_url || undefined,
      }));
    });

    setPhaseTasks(loadedTasks);
    setTemplateApplied(true);

    // Pré-popular título e objetivo se estiverem vazios
    if (!form.title && missionTemplate.sprint.title) {
      setForm(prev => ({
        ...prev,
        title: missionTemplate.sprint.title,
        objective: prev.objective || missionTemplate.sprint.objective || '',
      }));
    }
  }, [form.mission_id, savedTemplates]);

  const addTask = (phaseIdx) => {
    const text = newTaskTexts[phaseIdx]?.trim();
    if (!text) return;
    const updated = [...phaseTasks];
    updated[phaseIdx] = [...updated[phaseIdx], {
      description: text,
      status: "to_do",
      instructions: newTaskInstructions[phaseIdx]?.trim() || undefined,
      link_url: newTaskLinks[phaseIdx]?.trim() || undefined,
    }];
    setPhaseTasks(updated);
    const newTexts = [...newTaskTexts];
    newTexts[phaseIdx] = "";
    setNewTaskTexts(newTexts);
    const newInstr = [...newTaskInstructions];
    newInstr[phaseIdx] = "";
    setNewTaskInstructions(newInstr);
    const newLinks = [...newTaskLinks];
    newLinks[phaseIdx] = "";
    setNewTaskLinks(newLinks);
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
    const templateId = (form.cronograma_template_id && form.cronograma_template_id !== "none")
      ? form.cronograma_template_id
      : null;

    const missionId = form.mission_id || "custom";

    await base44.entities.ConsultoriaSprint.create({
      workshop_id: form.workshop_id,
      cronograma_template_id: templateId,
      mission_id: missionId,
      title: form.title,
      objective: form.objective,
      start_date: form.start_date,
      end_date: form.end_date,
      sprint_number: form.sprint_number,
      phases,
      status: "in_progress",
      progress_percentage: 0,
      consulting_firm_id: user?.data?.consulting_firm_id || "",
      consultor_id: user?.id || "",
    });

    toast.success(`Sprint criado para ${workshop?.name || "cliente"}!`);
    setSaving(false);

    // Invalidar todas as queries relacionadas a sprints para sincronismo imediato
    queryClient.invalidateQueries({ queryKey: ["dashboard-sprints"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["sprints-client"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["sprints-reais"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["active-sprint-widget"], exact: false });

    onCreated?.();
    onClose();

    // Reset form
    setForm({
      workshop_id: "",
      cronograma_template_id: "",
      mission_id: "",
      title: "",
      objective: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      sprint_number: 1,
    });
    setPhaseTasks(DEFAULT_PHASES.map(() => []));
    setTemplateApplied(false);
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

          {/* Trilha (CronogramaTemplate) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Trilha de Aceleração</Label>
            <Select value={form.cronograma_template_id} onValueChange={(v) => updateField("cronograma_template_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma trilha (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem trilha (customizado)</SelectItem>
                {trilhas.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome_fase} {t.fase_oficina ? `— Fase ${t.fase_oficina}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trilhas.length === 0 && (
              <p className="text-xs text-amber-600">Nenhuma trilha cadastrada. Sprints serão criados sem trilha.</p>
            )}
          </div>

          {/* Missão (para carregar template) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Missão</Label>
            <Select value={form.mission_id} onValueChange={(v) => {
              updateField("mission_id", v);
              setTemplateApplied(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a missão (carrega tarefas do template)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Sem missão (personalizado)</SelectItem>
                {MISSION_OPTIONS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateApplied && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-700">
                <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                Tarefas carregadas da Consultoria Global (Matriz de Templates)
              </div>
            )}
            {form.mission_id && form.mission_id !== "custom" && !savedTemplates && (
              <p className="text-xs text-amber-600">Carregando template...</p>
            )}
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
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <Input
                      value={newTaskTexts[phaseIdx]}
                      onChange={(e) => {
                        const t = [...newTaskTexts];
                        t[phaseIdx] = e.target.value;
                        setNewTaskTexts(t);
                      }}
                      placeholder="Tarefa (obrigatório)..."
                      className="text-xs h-8"
                      onKeyDown={(e) => e.key === "Enter" && addTask(phaseIdx)}
                    />
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addTask(phaseIdx)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={newTaskInstructions[phaseIdx]}
                    onChange={(e) => {
                      const t = [...newTaskInstructions];
                      t[phaseIdx] = e.target.value;
                      setNewTaskInstructions(t);
                    }}
                    placeholder="Como fazer (instruções)..."
                    className="text-xs h-8"
                  />
                  <Input
                    value={newTaskLinks[phaseIdx]}
                    onChange={(e) => {
                      const t = [...newTaskLinks];
                      t[phaseIdx] = e.target.value;
                      setNewTaskLinks(t);
                    }}
                    placeholder="Link material complementar (https://...)"
                    className="text-xs h-8"
                  />
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