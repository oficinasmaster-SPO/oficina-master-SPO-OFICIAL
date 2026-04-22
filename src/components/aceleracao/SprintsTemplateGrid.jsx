import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Save, X, Plus, Trash2, ChevronDown, ChevronUp, Link, ExternalLink, RefreshCw, BookOpen, ArrowUp, ArrowDown } from 'lucide-react';
import { getDefaultTasksForPhase } from './sprintMissionTasks';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STORAGE_KEY = 'sprint_templates_v1';

const PHASES_CONFIG = [
  { name: 'Planning',      label: 'Sprint Planning', icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-800',   badge: 'bg-blue-100 text-blue-700',   desc: 'Planejar o que será feito no sprint.' },
  { name: 'Execution',     label: 'Execução',        icon: '▶️', color: 'bg-green-50 border-green-200 text-green-800', badge: 'bg-green-100 text-green-700', desc: 'A oficina executa as tarefas planejadas.' },
  { name: 'Monitoring',    label: 'Checkpoint',      icon: '📊', color: 'bg-purple-50 border-purple-200 text-purple-800', badge: 'bg-purple-100 text-purple-700', desc: 'Acompanhar o andamento no meio do caminho.' },
  { name: 'Review',        label: 'Sprint Review',   icon: '📈', color: 'bg-orange-50 border-orange-200 text-orange-800', badge: 'bg-orange-100 text-orange-700', desc: 'Revisar o que foi entregue.' },
  { name: 'Retrospective', label: 'Retrospectiva',   icon: '💬', color: 'bg-red-50 border-red-200 text-red-800',     badge: 'bg-red-100 text-red-700',    desc: 'Aprender e melhorar para o próximo sprint.' },
];

const DEFAULT_SPRINT_MISSIONS = [
  { id: 'sprint0',              icon: '🔍', name: 'Diagnóstico e Alinhamento' },
  { id: 'agenda_cheia',        icon: '📅', name: 'Agenda Cheia' },
  { id: 'fechamento_imbativel', icon: '🎯', name: 'Fechamento Imbatível' },
  { id: 'caixa_forte',         icon: '💰', name: 'Caixa Forte' },
  { id: 'empresa_organizada',  icon: '📊', name: 'Empresa Organizada' },
  { id: 'funcoes_claras',      icon: '👥', name: 'Funções Claras' },
  { id: 'contratacao_certa',   icon: '🎓', name: 'Contratação Certa' },
  { id: 'cultura_forte',       icon: '🌟', name: 'Cultura Forte' },
];

// Estrutura padrão: cada missão tem 1 sprint com 5 fases, tarefas carregadas do sprintMissionTasks
const buildDefaultData = () =>
  DEFAULT_SPRINT_MISSIONS.map(m => ({
    mission_id: m.id,
    mission_icon: m.icon,
    mission_name: m.name,
    sprint: {
      id: `${m.id}_sprint1`,
      sprint_number: 1,
      title: `Sprint 1 — ${m.name}`,
      objective: '',
      phases: PHASES_CONFIG.map(p => ({
        name: p.name,
        tasks: getDefaultTasksForPhase(m.id, p.name).map(t => ({
          description: t.description,
          instructions: '',
          link_url: '',
        })),
      })),
    },
  }));

// ──────────────────────────────────────────────
// TaskEditor: lista de tarefas de uma fase
// ──────────────────────────────────────────────
function TaskEditor({ tasks, onUpdate }) {
  const addTask = () => {
    onUpdate([...tasks, { description: '', instructions: '', link_url: '' }]);
  };

  const removeTask = (idx) => {
    onUpdate(tasks.filter((_, i) => i !== idx));
  };

  const updateTask = (idx, field, value) => {
    onUpdate(tasks.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const moveTask = (fromIdx, direction) => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= tasks.length) return;
    
    const newTasks = [...tasks];
    [newTasks[fromIdx], newTasks[toIdx]] = [newTasks[toIdx], newTasks[fromIdx]];
    onUpdate(newTasks);
  };

  return (
    <div className="space-y-2 mt-2">
      {tasks.map((task, idx) => (
        <div key={idx} className="bg-white rounded-lg p-3 space-y-2 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Tarefa {idx + 1}</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                onClick={() => moveTask(idx, 'up')}
                disabled={idx === 0}
                title="Mover para cima"
              >
                <ArrowUp className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                onClick={() => moveTask(idx, 'down')}
                disabled={idx === tasks.length - 1}
                title="Mover para baixo"
              >
                <ArrowDown className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeTask(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="Descrição da tarefa"
            value={task.description}
            onChange={e => updateTask(idx, 'description', e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Instruções de como executar (opcional)"
            value={task.instructions}
            onChange={e => updateTask(idx, 'instructions', e.target.value)}
            className="text-sm resize-none h-14"
          />
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <Input
              placeholder="URL do material complementar (opcional)"
              value={task.link_url}
              onChange={e => updateTask(idx, 'link_url', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addTask} className="w-full text-xs">
        <Plus className="w-3 h-3 mr-1" /> Adicionar Tarefa
      </Button>
    </div>
  );
}

// ──────────────────────────────────────────────
// TaskDetailModal: modal com instrução + link
// ──────────────────────────────────────────────
function TaskDetailModal({ task, open, onClose }) {
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-gray-900 leading-snug">
            {task.description}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {task.instructions && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Instrução</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.instructions}</p>
            </div>
          )}
          {task.link_url && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Material Complementar</p>
              <a
                href={task.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {task.link_url}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// PhaseRow: uma fase com suas tarefas
// ──────────────────────────────────────────────
function PhaseRow({ phaseData, phaseConfig, editing, onUpdateTasks }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const totalTasks = phaseData.tasks?.length || 0;

  const hasDetail = (task) => !!(task.instructions || task.link_url);

  return (
    <div className={`rounded-lg border p-3 ${phaseConfig.color}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{phaseConfig.icon}</span>
          <div>
            <span className="font-semibold text-sm">{phaseConfig.label}</span>
            <p className="text-xs opacity-70">{phaseConfig.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseConfig.badge}`}>
            {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-current/10 pt-3">
          {editing ? (
            <TaskEditor
              tasks={phaseData.tasks || []}
              onUpdate={onUpdateTasks}
            />
          ) : (
            phaseData.tasks?.length > 0 ? (
              <div className="space-y-1.5">
                {phaseData.tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className={`bg-white/70 rounded p-2 text-xs flex items-start justify-between gap-2 ${hasDetail(task) ? 'cursor-pointer hover:bg-white transition-colors' : ''}`}
                    onClick={() => hasDetail(task) && setSelectedTask(task)}
                  >
                    <p className="font-semibold text-gray-800">• {task.description}</p>
                    {hasDetail(task) && (
                      <BookOpen className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs opacity-60 italic">Nenhuma tarefa cadastrada.</p>
            )
          )}
        </div>
      )}

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// SprintEditor: sprint completo com 5 fases
// ──────────────────────────────────────────────
function SprintEditor({ sprint, onSave }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editData, setEditData] = useState(sprint);

  const handleSave = () => {
    onSave(editData);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditData(sprint);
    setEditing(false);
  };

  const updatePhaseTasksInEdit = (phaseIdx, tasks) => {
    const phases = editData.phases.map((p, i) => i === phaseIdx ? { ...p, tasks } : p);
    setEditData({ ...editData, phases });
  };

  const totalTasks = sprint.phases?.reduce((acc, p) => acc + (p.tasks?.length || 0), 0) || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer flex-1"
            onClick={() => !editing && setExpanded(!expanded)}
          >
            <Badge variant="secondary" className="text-xs">Sprint {sprint.sprint_number}</Badge>
            {editing ? (
              <Input
                value={editData.title}
                onChange={e => setEditData({ ...editData, title: e.target.value })}
                className="h-7 text-sm font-semibold w-56"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="font-semibold text-sm text-gray-900">{sprint.title}</span>
            )}
            <span className="text-xs text-gray-400">{totalTasks} tarefas no total</span>
          </div>
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSave} className="h-7 text-xs">
                  <Save className="w-3.5 h-3.5 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 text-xs">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(true); setExpanded(true); }}>
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </>
            )}
          </div>
        </div>
        {editing && (
          <Textarea
            value={editData.objective}
            onChange={e => setEditData({ ...editData, objective: e.target.value })}
            placeholder="Objetivo do sprint..."
            className="mt-2 text-sm resize-none h-14"
          />
        )}
        {!editing && sprint.objective && (
          <p className="text-xs text-gray-500 mt-1">{sprint.objective}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-2 border-t">
          {PHASES_CONFIG.map((phaseConfig, phaseIdx) => {
            const phaseData = (editing ? editData : sprint).phases?.[phaseIdx] || { tasks: [] };
            return (
              <PhaseRow
                key={phaseConfig.name}
                phaseData={phaseData}
                phaseConfig={phaseConfig}
                editing={editing}
                onUpdateTasks={(tasks) => updatePhaseTasksInEdit(phaseIdx, tasks)}
              />
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────
// SprintsTemplateGrid — componente principal
// ──────────────────────────────────────────────
export default function SprintsTemplateGrid() {
  const [data, setData] = useState(buildDefaultData);
  const [expandedMission, setExpandedMission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carregar templates salvos do banco ao montar
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await base44.entities.SystemSetting.filter({ key: STORAGE_KEY });
        if (settings?.length > 0 && settings[0].value) {
          const saved = JSON.parse(settings[0].value);
          if (Array.isArray(saved) && saved.length > 0) {
            setData(saved);
          }
        }
      } catch {
        // se falhar, mantém o padrão
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const propagateUpdates = async (missionId, phaseIdx, newTasks) => {
    try {
      const response = await base44.functions.invoke('propagateSprintTemplateUpdates', {
        missionId,
        phaseIdx,
        newTasks,
      });

      if (response.data?.success) {
        const count = response.data.updatedCount;
        if (count > 0) {
          toast.success(`Template propagado para ${count} sprint(s) de clientes`);
        }
        if (response.data.errors?.length > 0) {
          console.warn('Alguns sprints falharam:', response.data.errors);
          toast.warning(`Atualizados ${count} sprints, mas ${response.data.errors.length} tiveram erro`);
        }
      }
    } catch (err) {
      console.error('Erro ao propagar:', err);
      toast.error('Erro ao propagar template para clientes');
    }
  };

  const handleSprintSave = async (missionId, updatedSprint) => {
    const newData = data.map(m => m.mission_id === missionId ? { ...m, sprint: updatedSprint } : m);
    setData(newData);
    // Persistir no banco
    setSaving(true);
    try {
      const existing = await base44.entities.SystemSetting.filter({ key: STORAGE_KEY });
      const payload = { key: STORAGE_KEY, value: JSON.stringify(newData) };
      if (existing?.length > 0) {
        await base44.entities.SystemSetting.update(existing[0].id, payload);
      } else {
        await base44.entities.SystemSetting.create(payload);
      }
      
      // Propagar atualizações para todos os sprints de clientes
      const oldSprint = data.find(m => m.mission_id === missionId)?.sprint;
      if (oldSprint?.phases && updatedSprint?.phases) {
        for (let phaseIdx = 0; phaseIdx < updatedSprint.phases.length; phaseIdx++) {
          const oldTasks = oldSprint.phases[phaseIdx]?.tasks || [];
          const newTasks = updatedSprint.phases[phaseIdx]?.tasks || [];
          
          // Detectar se houve mudanças nessa fase
          const hasChanges = JSON.stringify(oldTasks) !== JSON.stringify(newTasks);
          if (hasChanges) {
            await propagateUpdates(missionId, phaseIdx, newTasks);
          }
        }
      }
      
      toast.success('Template salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    const defaultData = buildDefaultData();
    setData(defaultData);
    setSaving(true);
    try {
      const existing = await base44.entities.SystemSetting.filter({ key: STORAGE_KEY });
      const payload = { key: STORAGE_KEY, value: JSON.stringify(defaultData) };
      if (existing?.length > 0) {
        await base44.entities.SystemSetting.update(existing[0].id, payload);
      } else {
        await base44.entities.SystemSetting.create(payload);
      }
      toast.success('Templates restaurados para o padrão!');
    } catch {
      toast.error('Erro ao restaurar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-900">Sprints Padrão por Missão</p>
            <p className="text-sm text-blue-700 mt-1">
              Cada sprint tem <strong>5 fases fixas</strong>: Planning → Execução → Checkpoint → Review → Retrospectiva.
              Configure as tarefas de cada fase clicando em ✏️. As edições são <strong>persistidas no banco</strong> e usadas ao criar novos sprints para clientes.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleResetToDefault} disabled={saving} className="shrink-0 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${saving ? 'animate-spin' : ''}`} />
            Restaurar Padrão
          </Button>
        </div>
        {!loaded && <p className="text-xs text-blue-600 mt-2">Carregando templates salvos...</p>}
        {saving && <p className="text-xs text-blue-600 mt-2">💾 Salvando...</p>}
      </div>

      <div className="space-y-3">
        {data.map((mission) => {
          const totalTasks = mission.sprint.phases?.reduce((acc, p) => acc + (p.tasks?.length || 0), 0) || 0;
          return (
            <Card key={mission.mission_id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => setExpandedMission(expandedMission === mission.mission_id ? null : mission.mission_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mission.mission_icon}</span>
                    <div>
                      <CardTitle className="text-base">{mission.mission_name}</CardTitle>
                      <p className="text-xs text-gray-500">
                        5 fases • {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''} cadastrada{totalTasks !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {expandedMission === mission.mission_id
                    ? <ChevronUp className="w-5 h-5 text-gray-400" />
                    : <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </CardHeader>

              {expandedMission === mission.mission_id && (
                <CardContent className="pt-0 pb-4 border-t">
                  <SprintEditor
                    sprint={mission.sprint}
                    onSave={(updated) => handleSprintSave(mission.mission_id, updated)}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}