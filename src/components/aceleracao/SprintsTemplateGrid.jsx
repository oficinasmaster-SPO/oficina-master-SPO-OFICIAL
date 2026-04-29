import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Save, X, Plus, Trash2, ChevronDown, ChevronUp, Link, ExternalLink, RefreshCw, BookOpen, ArrowUp, ArrowDown, Zap, Check } from 'lucide-react';
import { getDefaultTasksForPhase } from './sprintMissionTasks';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import VideoUploadRecorder from './VideoUploadRecorder';

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
  { id: 'chefe_patio',          icon: '🧭', name: 'Implementação do Chefe de Pátio' },
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
          video_url: '',
        })),
      })),
    },
  }));

// ──────────────────────────────────────────────
// TaskEditor: lista de tarefas de uma fase
// ──────────────────────────────────────────────
function TaskEditor({ tasks, onUpdate }) {
  const addTask = () => {
    onUpdate([...tasks, { description: '', instructions: '', link_url: '', video_url: '' }]);
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
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500">🎬 Vídeo de instrução (micro aula)</span>
            <VideoUploadRecorder
              videoUrl={task.video_url}
              onVideoSaved={(url) => updateTask(idx, 'video_url', url)}
              onVideoRemoved={() => updateTask(idx, 'video_url', '')}
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
          {task.video_url && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🎬 Vídeo de Instrução</p>
              <video src={task.video_url} controls playsInline className="w-full rounded-lg bg-black max-h-64" />
            </div>
          )}
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

  const hasDetail = (task) => !!(task.instructions || task.link_url || task.video_url);

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
// SyncButton — 3 estados: idle / syncing / success
// ──────────────────────────────────────────────
function SyncButton({ onClick, disabled }) {
  const [state, setState] = React.useState('idle'); // idle | syncing | success

  const handleClick = async () => {
    if (state !== 'idle' || disabled) return;
    setState('syncing');
    try {
      await onClick();
      setState('success');
      setTimeout(() => setState('idle'), 1800);
    } catch {
      setState('idle');
    }
  };

  const isSyncing = state === 'syncing';
  const isSuccess = state === 'success';

  const label = isSyncing ? 'Sincronizando' : isSuccess ? 'Sincronizado' : 'Forçar Sync para Clientes';

  return (
    <>
      <style>{`
        @keyframes syncSpin    { to { transform: rotate(360deg); } }
        @keyframes syncShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
        @keyframes syncProgress {
          0%   { transform: translateX(-100%) scaleX(0.4); }
          50%  { transform: translateX(20%)   scaleX(0.7); }
          100% { transform: translateX(120%)  scaleX(0.4); }
        }
        @keyframes syncPulse {
          0%   { transform: scale(1);    opacity: 0.55; }
          70%  { transform: scale(1.18); opacity: 0; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes syncDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1);   opacity: 1;   }
        }
        @keyframes syncCheckIn {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .sync-btn-root { position: relative; overflow: hidden; }
        .sync-spin { animation: syncSpin 1000ms linear infinite; }
        .sync-shimmer { animation: syncShimmer 1600ms ease-in-out infinite; }
        .sync-progress { animation: syncProgress 1400ms cubic-bezier(0.4,0,0.2,1) infinite; }
        .sync-pulse { animation: syncPulse 1800ms cubic-bezier(0.4,0,0.6,1) infinite; }
        .sync-dot-0 { animation: syncDot 1200ms ease-in-out infinite 0ms; }
        .sync-dot-1 { animation: syncDot 1200ms ease-in-out infinite 150ms; }
        .sync-dot-2 { animation: syncDot 1200ms ease-in-out infinite 300ms; }
        .sync-check { animation: syncCheckIn 300ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .sync-spin, .sync-shimmer, .sync-progress, .sync-pulse,
          .sync-dot-0, .sync-dot-1, .sync-dot-2 { animation: none !important; }
        }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        disabled={isSyncing || disabled}
        aria-busy={isSyncing}
        aria-live="polite"
        className="sync-btn-root shrink-0"
        style={{
          height: 'auto',
          padding: '0.625rem 1rem',
          borderRadius: '0.75rem',
          border: isSuccess
            ? '1px solid hsl(152 70% 45% / 0.4)'
            : isSyncing
              ? '1px solid transparent'
              : '1px solid hsl(24 95% 53% / 0.45)',
          background: isSuccess
            ? 'hsl(150 84% 96%)'
            : isSyncing
              ? 'linear-gradient(135deg, hsl(32 97% 60%), hsl(20 90% 50%))'
              : 'hsl(33 100% 96%)',
          backgroundSize: isSyncing ? '200% 200%' : 'auto',
          color: isSuccess ? 'hsl(152 65% 30%)' : isSyncing ? '#fff' : 'hsl(24 95% 53%)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: isSuccess
            ? '0 8px 22px -10px hsl(152 70% 40% / 0.5)'
            : isSyncing
              ? '0 10px 30px -8px hsl(24 95% 53% / 0.60), 0 0 0 4px hsl(32 97% 60% / 0.18)'
              : '0 8px 22px -10px hsl(24 95% 53% / 0.55), 0 0 0 1px hsl(24 95% 53% / 0.20)',
          transition: 'all 300ms ease',
        }}
      >
        {/* Shimmer strip (syncing only) */}
        {isSyncing && (
          <span
            className="sync-shimmer"
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
              width: '33%',
            }}
          />
        )}

        {/* Icon area */}
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulse ring */}
          {isSyncing && (
            <span
              className="sync-pulse"
              style={{
                position: 'absolute', width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
              }}
            />
          )}
          {isSuccess
            ? <Check size={16} strokeWidth={3} className="sync-check" />
            : isSyncing
              ? <RefreshCw size={16} strokeWidth={2.5} className="sync-spin" />
              : <Zap size={16} strokeWidth={2.5} />
          }
        </span>

        {/* Label */}
        <span>{label}</span>

        {/* Animated dots (syncing only) */}
        {isSyncing && (
          <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <span key={i} className={`sync-dot-${i}`} style={{
                display: 'block', width: 4, height: 4, borderRadius: '50%', background: '#fff',
              }} />
            ))}
          </span>
        )}

        {/* Progress bar (syncing only) */}
        {isSyncing && (
          <span
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 3, overflow: 'hidden', borderRadius: 9999,
            }}
          >
            <span
              className="sync-progress"
              style={{
                display: 'block', height: '100%', width: '100%',
                background: 'rgba(255,255,255,0.8)', borderRadius: 9999,
              }}
            />
          </span>
        )}
      </button>
    </>
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
            // Garantir que TODAS as tarefas têm os 4 campos (video_url pode estar faltando em dados antigos)
            const normalizeTask = (t) => ({
              description: t.description || '',
              instructions: t.instructions || '',
              link_url: t.link_url || '',
              video_url: t.video_url || '',
            });
            const normalized = saved.map(m => ({
              ...m,
              sprint: {
                ...m.sprint,
                phases: (m.sprint.phases || []).map(p => ({
                  ...p,
                  tasks: (p.tasks || []).map(normalizeTask),
                })),
              },
            }));
            // Merge: preserva dados salvos, adiciona missões novas que não existem no banco
            const defaultData = buildDefaultData();
            const savedIds = new Set(normalized.map(m => m.mission_id));
            const newMissions = defaultData.filter(m => !savedIds.has(m.mission_id));
            setData([...normalized, ...newMissions]);
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

  const handleSprintSave = async (missionId, updatedSprint) => {
    const newData = data.map(m => m.mission_id === missionId ? { ...m, sprint: updatedSprint } : m);
    setData(newData);
    setSaving(true);
    try {
      // 1. Persistir template no banco
      const existing = await base44.entities.SystemSetting.filter({ key: STORAGE_KEY });
      const payload = { key: STORAGE_KEY, value: JSON.stringify(newData) };
      if (existing?.length > 0) {
        await base44.entities.SystemSetting.update(existing[0].id, payload);
      } else {
        await base44.entities.SystemSetting.create(payload);
      }

      // 2. Sincronizar todos os sprints de clientes com o template atualizado
      //    Uma única chamada cobre: adição, remoção, edição de description/instructions/link_url/video_url
      toast.info('🔄 Propagando template para sprints de clientes...');
      const response = await base44.functions.invoke('syncClientSprintTasksWithTemplate', { missionId });
      const count = response.data?.updatedCount ?? 0;

      if (response.data?.errors?.length > 0) {
        console.warn('Erros parciais ao sincronizar:', response.data.errors);
        toast.warning(`Template salvo. ${count} sprint(s) atualizados, mas ${response.data.errors.length} tiveram erro.`);
      } else if (count > 0) {
        toast.success(`✅ Template salvo e propagado para ${count} sprint(s) de clientes!`);
      } else {
        toast.success('✅ Template salvo com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleForceSyncAll = async () => {
    let total = 0;
    let errors = 0;
    for (const mission of data) {
      try {
        const response = await base44.functions.invoke('syncClientSprintTasksWithTemplate', { missionId: mission.mission_id });
        total += response.data?.updatedCount ?? 0;
        if (response.data?.errors?.length) errors += response.data.errors.length;
      } catch {
        errors++;
      }
    }
    if (errors > 0) {
      toast.warning(`Sincronização concluída: ${total} sprint(s) atualizados, ${errors} erro(s).`);
    } else {
      toast.success(`✅ Todas as sprints de clientes sincronizadas! (${total} sprint(s) atualizados)`);
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
          <div className="flex items-center gap-2">
            <SyncButton onClick={handleForceSyncAll} disabled={saving} />
            <Button size="sm" variant="outline" onClick={handleResetToDefault} disabled={saving} className="shrink-0 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${saving ? 'animate-spin' : ''}`} />
              Restaurar Padrão
            </Button>
          </div>
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