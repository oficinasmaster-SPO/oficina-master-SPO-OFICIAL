import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X, Plus, Trash2, ChevronDown, ChevronUp, Link, ExternalLink } from 'lucide-react';

const DEFAULT_SPRINT_MISSIONS = [
  { id: 'agenda_cheia', icon: '📅', name: 'Agenda Cheia' },
  { id: 'fechamento_imbativel', icon: '🎯', name: 'Fechamento Imbatível' },
  { id: 'caixa_forte', icon: '💰', name: 'Caixa Forte' },
  { id: 'empresa_organizada', icon: '📊', name: 'Empresa Organizada' },
  { id: 'funcoes_claras', icon: '👥', name: 'Funções Claras' },
  { id: 'contratacao_certa', icon: '🎓', name: 'Contratação Certa' },
  { id: 'cultura_forte', icon: '🌟', name: 'Cultura Forte' },
];

const DEFAULT_SPRINTS = DEFAULT_SPRINT_MISSIONS.map(m => ({
  mission_id: m.id,
  mission_icon: m.icon,
  mission_name: m.name,
  sprints: [
    {
      id: `${m.id}_sprint0`,
      sprint_number: 0,
      title: 'Diagnóstico',
      objective: 'Diagnóstico inicial e alinhamento de expectativas',
      phases: ['Planning', 'Execution', 'Review'],
      tasks: [],
    },
    {
      id: `${m.id}_sprint1`,
      sprint_number: 1,
      title: 'Sprint 1',
      objective: 'Primeira etapa de implementação',
      phases: ['Planning', 'Execution', 'Monitoring', 'Review', 'Retrospective'],
      tasks: [],
    },
  ]
}));

function TaskEditor({ tasks, onUpdate }) {
  const addTask = () => {
    onUpdate([...tasks, { description: '', instructions: '', link_url: '' }]);
  };

  const removeTask = (idx) => {
    onUpdate(tasks.filter((_, i) => i !== idx));
  };

  const updateTask = (idx, field, value) => {
    const updated = tasks.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      {tasks.map((task, idx) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tarefa {idx + 1}</span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => removeTask(idx)}>
              <Trash2 className="w-3 h-3" />
            </Button>
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
            className="text-sm resize-none h-16"
          />
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              placeholder="URL do material complementar (opcional)"
              value={task.link_url}
              onChange={e => updateTask(idx, 'link_url', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addTask} className="w-full">
        <Plus className="w-4 h-4 mr-1" />
        Adicionar Tarefa
      </Button>
    </div>
  );
}

function SprintCard({ sprint, missionName, onSave }) {
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

  if (editing) {
    return (
      <Card className="border-blue-400 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Sprint {sprint.sprint_number}</Badge>
              <Input
                value={editData.title}
                onChange={e => setEditData({ ...editData, title: e.target.value })}
                className="font-semibold h-8 text-sm w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">Objetivo</label>
            <Textarea
              value={editData.objective}
              onChange={e => setEditData({ ...editData, objective: e.target.value })}
              className="mt-1 resize-none h-16 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Tarefas</label>
            <TaskEditor
              tasks={editData.tasks || []}
              onUpdate={(tasks) => setEditData({ ...editData, tasks })}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Sprint {sprint.sprint_number}</Badge>
            <span className="font-semibold text-gray-900 text-sm">{sprint.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">{sprint.tasks?.length || 0} tarefas</span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(true)}>
              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        {sprint.objective && (
          <p className="text-xs text-gray-500 mt-1">{sprint.objective}</p>
        )}
      </CardHeader>

      {expanded && sprint.tasks?.length > 0 && (
        <CardContent className="pt-0 space-y-2">
          {sprint.tasks.map((task, idx) => (
            <div key={idx} className="bg-gray-50 rounded-md p-2 text-xs space-y-1">
              <p className="font-semibold text-gray-800">{task.description}</p>
              {task.instructions && (
                <p className="text-gray-500">{task.instructions}</p>
              )}
              {task.link_url && (
                <a
                  href={task.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Material complementar
                </a>
              )}
            </div>
          ))}
        </CardContent>
      )}

      {expanded && (!sprint.tasks || sprint.tasks.length === 0) && (
        <CardContent className="pt-0">
          <p className="text-xs text-gray-400 italic">Nenhuma tarefa cadastrada. Clique em editar para adicionar.</p>
        </CardContent>
      )}
    </Card>
  );
}

export default function SprintsTemplateGrid() {
  const [data, setData] = useState(DEFAULT_SPRINTS);
  const [expandedMission, setExpandedMission] = useState(null);

  const handleSprintSave = (missionId, sprintId, updatedSprint) => {
    setData(data.map(m =>
      m.mission_id === missionId
        ? { ...m, sprints: m.sprints.map(s => s.id === sprintId ? updatedSprint : s) }
        : m
    ));
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-900">Sprints Padrão por Missão</p>
        <p className="text-sm text-blue-700 mt-1">
          Configure as tarefas e materiais complementares de cada sprint. Clique em ✏️ para editar.
        </p>
      </div>

      <div className="space-y-3">
        {data.map((mission) => (
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
                    <p className="text-xs text-gray-500">{mission.sprints.length} sprint(s) configurados</p>
                  </div>
                </div>
                {expandedMission === mission.mission_id
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </CardHeader>

            {expandedMission === mission.mission_id && (
              <CardContent className="pt-0 pb-4 space-y-3 border-t">
                {mission.sprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    missionName={mission.mission_name}
                    onSave={(updated) => handleSprintSave(mission.mission_id, sprint.id, updated)}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}