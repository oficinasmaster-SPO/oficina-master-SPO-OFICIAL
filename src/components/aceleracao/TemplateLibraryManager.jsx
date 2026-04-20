import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Copy, ChevronDown, ChevronUp, Plus, Pencil } from 'lucide-react';
import WheelLoader from '@/components/ui/WheelLoader';
import MissionsTemplateGrid from './MissionsTemplateGrid';
import SprintsTemplateGrid from './SprintsTemplateGrid';
import { toast } from 'sonner';

const MISSIONS_STORAGE_KEY = 'missions_templates_v1';
const SPRINTS_STORAGE_KEY = 'sprint_templates_v1';

const DEFAULT_MISSIONS_LIST = [
  { id: 'agenda_cheia',         icon: '📅', name: 'Agenda Cheia' },
  { id: 'fechamento_imbativel', icon: '🎯', name: 'Fechamento Imbatível' },
  { id: 'caixa_forte',          icon: '💰', name: 'Caixa Forte' },
  { id: 'empresa_organizada',   icon: '📊', name: 'Empresa Organizada' },
  { id: 'funcoes_claras',       icon: '👥', name: 'Funções Claras' },
  { id: 'contratacao_certa',    icon: '🎓', name: 'Contratação Certa' },
  { id: 'cultura_forte',        icon: '🌟', name: 'Cultura Forte' },
];

function MissionPicker({ selected = [], onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(m => m !== id));
    else onChange([...selected, id]);
  };
  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {DEFAULT_MISSIONS_LIST.map(m => {
        const isSelected = selected.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
              isSelected
                ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-medium'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            <span>{m.icon}</span>
            <span className="truncate">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * TemplateLibraryManager - Matriz Global de Templates Padrão
 * Consolida todas as trilhas, missões e sprints de todos os clientes
 * como templates editáveis e reutilizáveis
 */
export default function TemplateLibraryManager() {
  const [templates, setTemplates] = useState({
    trails: [],
    missions: [],
    sprints: []
  });
  const [expandedTrail, setExpandedTrail] = useState(null);
  const [expandedSprint, setExpandedSprint] = useState(null);
  const queryClient = useQueryClient();

  // ── Modais de criação ──
  const [showNewTrail, setShowNewTrail] = useState(false);
  const [showNewMission, setShowNewMission] = useState(false);
  const [showNewSprint, setShowNewSprint] = useState(false);

  const [newTrail, setNewTrail] = useState({ nome_fase: '', objetivo_geral: '', missoes_selecionadas: [] });
  const [newMission, setNewMission] = useState({ icon: '🎯', name: '', description: '', linked_sprint_id: '' });
  const [newSprint, setNewSprint] = useState({ mission_icon: '🚀', mission_name: '', objective: '' });
  const [creating, setCreating] = useState(false);

  // ── Modal de edição de trilha ──
  const [editingTrail, setEditingTrail] = useState(null); // { id, nome_fase, objetivo_geral }
  const [saving, setSaving] = useState(false);

  // Busca todas as trilhas (CronogramaTemplate)
  const { data: allTrails = [], isLoading: loadingTrails } = useQuery({
    queryKey: ['allCronogramaTemplates'],
    queryFn: async () => {
      try {
        const data = await base44.entities.CronogramaTemplate.list('-updated_date', 500);
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar trilhas:', error);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Busca todos os sprints (ConsultoriaSprint)
  const { data: allSprints = [], isLoading: loadingSprints } = useQuery({
    queryKey: ['allConsultoriaSprints'],
    queryFn: async () => {
      try {
        const data = await base44.entities.ConsultoriaSprint.list('-updated_date', 500);
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar sprints:', error);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Processa e consolida os dados em um formato de matriz única
  useEffect(() => {
    if (allTrails.length === 0 && allSprints.length === 0) {
      setTemplates({ trails: [], missions: [], sprints: [] });
      return;
    }

    // Deduplica trilhas por missões selecionadas
    const trailsMap = new Map();
    allTrails.forEach(trail => {
      const key = JSON.stringify(trail.missoes_selecionadas?.sort() || []);
      if (!trailsMap.has(key)) {
        trailsMap.set(key, {
          id: trail.id,
          name: trail.nome_fase,
          objetivo_geral: trail.objetivo_geral || '',
          missions: trail.missoes_selecionadas || [],
          source: `${trail.workshop_id}`,
          createdAt: trail.created_date,
        });
      }
    });

    // Extrai todas as missões únicas
    const missionsSet = new Set();
    allTrails.forEach(trail => {
      trail.missoes_selecionadas?.forEach(m => missionsSet.add(m));
    });
    allSprints.forEach(sprint => {
      if (sprint.mission_id) missionsSet.add(sprint.mission_id);
    });

    // Consolida sprints por missão e cronograma_template_id
    const sprintsMap = new Map();
    allSprints.forEach(sprint => {
      const key = `${sprint.cronograma_template_id}_${sprint.mission_id}`;
      if (!sprintsMap.has(key)) {
        sprintsMap.set(key, {
          id: sprint.id,
          title: sprint.title,
          objective: sprint.objective,
          mission_id: sprint.mission_id,
          sprint_number: sprint.sprint_number,
          phases: sprint.phases || [],
          start_date: sprint.start_date,
          end_date: sprint.end_date,
          progress_percentage: sprint.progress_percentage,
          status: sprint.status,
          total_tasks: countTotalTasks(sprint.phases),
          completed_tasks: countCompletedTasks(sprint.phases),
        });
      }
    });

    setTemplates({
      trails: Array.from(trailsMap.values()),
      missions: Array.from(missionsSet).sort(),
      sprints: Array.from(sprintsMap.values()),
    });
  }, [allTrails, allSprints]);

  const countTotalTasks = (phases) => {
    return phases.reduce((acc, phase) => acc + (phase.tasks?.length || 0), 0);
  };

  const countCompletedTasks = (phases) => {
    return phases.reduce((acc, phase) => 
      acc + (phase.tasks?.filter(t => t.status === 'done').length || 0), 0);
  };

  const handleDuplicateTrail = async (trail) => {
    // TODO: Implementar duplicação de trilha como template padrão
    console.log('Duplicando trilha:', trail);
  };

  const handleDuplicateSprint = async (sprint) => {
    // TODO: Implementar duplicação de sprint como template padrão
    console.log('Duplicando sprint:', sprint);
  };

  // ── Editar Trilha ──
  const handleSaveTrail = async () => {
    if (!editingTrail?.nome_fase?.trim()) { toast.error('Informe o nome da trilha'); return; }
    setSaving(true);
    try {
      await base44.entities.CronogramaTemplate.update(editingTrail.id, {
        nome_fase: editingTrail.nome_fase,
        objetivo_geral: editingTrail.objetivo_geral,
        missoes_selecionadas: editingTrail.missoes_selecionadas || [],
      });
      queryClient.invalidateQueries({ queryKey: ['allCronogramaTemplates'] });
      toast.success('Trilha atualizada!');
      setEditingTrail(null);
    } catch { toast.error('Erro ao salvar trilha'); }
    finally { setSaving(false); }
  };

  // ── Criar nova Trilha ──
  const handleCreateTrail = async () => {
    if (!newTrail.nome_fase.trim()) { toast.error('Informe o nome da trilha'); return; }
    setCreating(true);
    try {
      await base44.entities.CronogramaTemplate.create({
        nome_fase: newTrail.nome_fase,
        objetivo_geral: newTrail.objetivo_geral,
        missoes_selecionadas: newTrail.missoes_selecionadas,
        fase_oficina: 1,
        ativo: true,
      });
      queryClient.invalidateQueries({ queryKey: ['allCronogramaTemplates'] });
      toast.success('Trilha criada!');
      setShowNewTrail(false);
      setNewTrail({ nome_fase: '', objetivo_geral: '', missoes_selecionadas: [] });
    } catch { toast.error('Erro ao criar trilha'); }
    finally { setCreating(false); }
  };

  // ── Criar nova Missão (persiste no SystemSetting) ──
  const handleCreateMission = async () => {
    if (!newMission.name.trim()) { toast.error('Informe o nome da missão'); return; }
    setCreating(true);
    try {
      const existing = await base44.entities.SystemSetting.filter({ key: MISSIONS_STORAGE_KEY });
      const current = existing?.length > 0 && existing[0].value ? JSON.parse(existing[0].value) : [];
      const id = newMission.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const newItem = { id, icon: newMission.icon, name: newMission.name, description: newMission.description, linked_sprint_id: newMission.linked_sprint_id };
      const updated = [...current, newItem];
      const payload = { key: MISSIONS_STORAGE_KEY, value: JSON.stringify(updated) };
      if (existing?.length > 0) await base44.entities.SystemSetting.update(existing[0].id, payload);
      else await base44.entities.SystemSetting.create(payload);
      toast.success('Missão criada! Recarregue a aba Missões para ver.');
      setShowNewMission(false);
      setNewMission({ icon: '🎯', name: '', description: '', linked_sprint_id: '' });
    } catch { toast.error('Erro ao criar missão'); }
    finally { setCreating(false); }
  };

  // ── Criar novo Sprint template (persiste no SystemSetting) ──
  const handleCreateSprint = async () => {
    if (!newSprint.mission_name.trim()) { toast.error('Informe o nome da missão do sprint'); return; }
    setCreating(true);
    try {
      const existing = await base44.entities.SystemSetting.filter({ key: SPRINTS_STORAGE_KEY });
      const current = existing?.length > 0 && existing[0].value ? JSON.parse(existing[0].value) : [];
      const mission_id = newSprint.mission_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const newItem = {
        mission_id,
        mission_icon: newSprint.mission_icon,
        mission_name: newSprint.mission_name,
        sprint: {
          id: `${mission_id}_sprint1`,
          sprint_number: 1,
          title: `Sprint 1 — ${newSprint.mission_name}`,
          objective: newSprint.objective,
          phases: ['Planning','Execution','Monitoring','Review','Retrospective'].map(name => ({ name, tasks: [] })),
        },
      };
      const updated = [...current, newItem];
      const payload = { key: SPRINTS_STORAGE_KEY, value: JSON.stringify(updated) };
      if (existing?.length > 0) await base44.entities.SystemSetting.update(existing[0].id, payload);
      else await base44.entities.SystemSetting.create(payload);
      toast.success('Sprint criado! Recarregue a aba Sprints para ver.');
      setShowNewSprint(false);
      setNewSprint({ mission_icon: '🚀', mission_name: '', objective: '' });
    } catch { toast.error('Erro ao criar sprint'); }
    finally { setCreating(false); }
  };

  if (loadingTrails || loadingSprints) {
    return (
      <div className="flex items-center justify-center h-96">
        <WheelLoader size="lg" text="Carregando matriz de templates..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900">Matriz de Templates Padrão</h3>
            <p className="text-sm text-blue-700 mt-1">
              Base de trilhas guiadas, missões e sprints padrão para reutilizar e adaptar.
              As trilhas personalizadas dos clientes são montadas individualmente no cronograma de cada consultoria.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="trails" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trails">
            Trilhas Guiadas ({templates.trails.length})
          </TabsTrigger>
          <TabsTrigger value="missions">
            Missões ({templates.missions.length})
          </TabsTrigger>
          <TabsTrigger value="sprints">
            Sprints
          </TabsTrigger>
        </TabsList>

        {/* TAB: TRILHAS GUIADAS */}
        <TabsContent value="trails" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card className="bg-amber-50 border-amber-200 flex-1">
              <CardContent className="pt-4 text-sm text-amber-700">
                <p className="font-semibold mb-1">ℹ️ Trilhas Guiadas</p>
                <p>Modelos pré-prontos que podem ser usados como base. As trilhas personalizadas dos clientes são criadas individualmente no cronograma de consultoria após o diagnóstico.</p>
              </CardContent>
            </Card>
            <Button className="ml-4 shrink-0" onClick={() => setShowNewTrail(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nova Trilha
            </Button>
          </div>

          {templates.trails.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhuma trilha guiada encontrada no sistema.
              </CardContent>
            </Card>
          ) : (
            templates.trails.map((trail) => (
              <Card key={trail.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{trail.name}</CardTitle>
                      <CardDescription>
                        {trail.missions.length} missão(ões) • Fonte: {trail.source}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedTrail(expandedTrail === trail.id ? null : trail.id)}
                      >
                        {expandedTrail === trail.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTrail({ id: trail.id, nome_fase: trail.name, objetivo_geral: trail.objetivo_geral || '', missoes_selecionadas: trail.missions || [] })}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateTrail(trail)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedTrail === trail.id && (
                  <CardContent className="space-y-3 border-t pt-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Missões incluídas:</p>
                      <div className="flex flex-wrap gap-2">
                        {trail.missions.map((mission) => (
                          <Badge key={mission} variant="secondary">
                            {mission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t text-xs text-gray-500">
                      Criada em: {new Date(trail.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB: MISSÕES */}
        <TabsContent value="missions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewMission(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nova Missão
            </Button>
          </div>
          <MissionsTemplateGrid />
        </TabsContent>

        {/* TAB: SPRINTS */}
        <TabsContent value="sprints" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewSprint(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo Sprint
            </Button>
          </div>
          <SprintsTemplateGrid />
        </TabsContent>
      </Tabs>

      {/* ── Modal: Editar Trilha ── */}
      <Dialog open={!!editingTrail} onOpenChange={open => !open && setEditingTrail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Trilha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">Nome da Trilha *</label>
              <Input
                className="mt-1"
                value={editingTrail?.nome_fase || ''}
                onChange={e => setEditingTrail(prev => ({ ...prev, nome_fase: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Objetivo Geral</label>
              <Textarea
                className="mt-1 resize-none h-20"
                placeholder="Descreva o objetivo desta trilha..."
                value={editingTrail?.objetivo_geral || ''}
                onChange={e => setEditingTrail(prev => ({ ...prev, objetivo_geral: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Missões desta trilha</label>
              <MissionPicker
                selected={editingTrail?.missoes_selecionadas || []}
                onChange={v => setEditingTrail(prev => ({ ...prev, missoes_selecionadas: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrail(null)}>Cancelar</Button>
            <Button onClick={handleSaveTrail} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Nova Trilha ── */}
      <Dialog open={showNewTrail} onOpenChange={setShowNewTrail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Trilha Guiada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">Nome da Trilha *</label>
              <Input
                className="mt-1"
                placeholder="Ex: Trilha Crescimento Fase 1"
                value={newTrail.nome_fase}
                onChange={e => setNewTrail({ ...newTrail, nome_fase: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Objetivo Geral</label>
              <Textarea
                className="mt-1 resize-none h-20"
                placeholder="Descreva o objetivo desta trilha..."
                value={newTrail.objetivo_geral}
                onChange={e => setNewTrail({ ...newTrail, objetivo_geral: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Missões desta trilha</label>
              <MissionPicker
                selected={newTrail.missoes_selecionadas}
                onChange={v => setNewTrail({ ...newTrail, missoes_selecionadas: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTrail(false)}>Cancelar</Button>
            <Button onClick={handleCreateTrail} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Trilha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Nova Missão ── */}
      <Dialog open={showNewMission} onOpenChange={setShowNewMission}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Missão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <div className="w-24">
                <label className="text-sm font-semibold text-gray-700">Ícone</label>
                <Input
                  className="mt-1 text-center text-lg"
                  maxLength={2}
                  value={newMission.icon}
                  onChange={e => setNewMission({ ...newMission, icon: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700">Nome *</label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Reativação de Base"
                  value={newMission.name}
                  onChange={e => setNewMission({ ...newMission, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Descrição</label>
              <Textarea
                className="mt-1 resize-none h-20"
                placeholder="Descreva o objetivo desta missão..."
                value={newMission.description}
                onChange={e => setNewMission({ ...newMission, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMission(false)}>Cancelar</Button>
            <Button onClick={handleCreateMission} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Missão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Novo Sprint ── */}
      <Dialog open={showNewSprint} onOpenChange={setShowNewSprint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Sprint Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <div className="w-24">
                <label className="text-sm font-semibold text-gray-700">Ícone</label>
                <Input
                  className="mt-1 text-center text-lg"
                  maxLength={2}
                  value={newSprint.mission_icon}
                  onChange={e => setNewSprint({ ...newSprint, mission_icon: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700">Nome da Missão *</label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Pós-Venda Ativo"
                  value={newSprint.mission_name}
                  onChange={e => setNewSprint({ ...newSprint, mission_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Objetivo do Sprint</label>
              <Textarea
                className="mt-1 resize-none h-20"
                placeholder="O que este sprint deve alcançar?"
                value={newSprint.objective}
                onChange={e => setNewSprint({ ...newSprint, objective: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-500">O sprint será criado com 5 fases (Planning, Execução, Checkpoint, Review, Retrospectiva) sem tarefas. Configure as tarefas de cada fase diretamente na grade de Sprints.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSprint(false)}>Cancelar</Button>
            <Button onClick={handleCreateSprint} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}