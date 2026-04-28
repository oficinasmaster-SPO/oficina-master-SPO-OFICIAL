import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'missions_templates_v1';

/**
 * Sprints disponíveis para vincular (espelha DEFAULT_SPRINT_MISSIONS do SprintsTemplateGrid)
 */
const AVAILABLE_SPRINTS = [
  { id: 'sprint0',              icon: '🔍', name: 'Diagnóstico e Alinhamento' },
  { id: 'chefe_patio',          icon: '🧭', name: 'Implementação do Chefe de Pátio' },
  { id: 'agenda_cheia',         icon: '📅', name: 'Agenda Cheia' },
  { id: 'fechamento_imbativel', icon: '🎯', name: 'Fechamento Imbatível' },
  { id: 'caixa_forte',          icon: '💰', name: 'Caixa Forte' },
  { id: 'empresa_organizada',   icon: '📊', name: 'Empresa Organizada' },
  { id: 'funcoes_claras',       icon: '👥', name: 'Funções Claras' },
  { id: 'contratacao_certa',    icon: '🎓', name: 'Contratação Certa' },
  { id: 'cultura_forte',        icon: '🌟', name: 'Cultura Forte' },
];

const DEFAULT_MISSIONS = [
  {
    id: 'agenda_cheia',
    icon: '📅',
    name: 'Agenda Cheia',
    description: 'Preencher a agenda semanal com 100% de ocupação de vendas',
    linked_sprint_id: 'agenda_cheia',
  },
  {
    id: 'fechamento_imbativel',
    icon: '🎯',
    name: 'Fechamento Imbatível',
    description: 'Aumentar taxa de conversão de propostas para vendas',
    linked_sprint_id: 'fechamento_imbativel',
  },
  {
    id: 'caixa_forte',
    icon: '💰',
    name: 'Caixa Forte',
    description: 'Fortalecer fluxo de caixa e gestão financeira',
    linked_sprint_id: 'caixa_forte',
  },
  {
    id: 'empresa_organizada',
    icon: '📊',
    name: 'Empresa Organizada',
    description: 'Estruturar processos e operações da empresa',
    linked_sprint_id: 'empresa_organizada',
  },
  {
    id: 'funcoes_claras',
    icon: '👥',
    name: 'Funções Claras',
    description: 'Definir papéis, responsabilidades e organograma',
    linked_sprint_id: 'funcoes_claras',
  },
  {
    id: 'contratacao_certa',
    icon: '🎓',
    name: 'Contratação Certa',
    description: 'Otimizar processo de seleção e onboarding',
    linked_sprint_id: 'contratacao_certa',
  },
  {
    id: 'cultura_forte',
    icon: '🌟',
    name: 'Cultura Forte',
    description: 'Desenvolver cultura organizacional e engajamento',
    linked_sprint_id: 'cultura_forte',
  },
  {
    id: 'chefe_patio',
    icon: '🧭',
    name: 'Implementação do Chefe de Pátio',
    description: 'Estruturar a liderança do pátio para aumentar produtividade, controle operacional e resultados de faturamento.',
    linked_sprint_id: 'chefe_patio',
  },
];

export default function MissionsTemplateGrid() {
  const [missions, setMissions] = useState(DEFAULT_MISSIONS);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Carregar missões salvas do banco ao montar
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await base44.entities.SystemSetting.filter({ key: STORAGE_KEY });
        if (settings?.length > 0 && settings[0].value) {
          const saved = JSON.parse(settings[0].value);
          if (Array.isArray(saved) && saved.length > 0) {
            // Merge: preserva dados salvos, adiciona missões novas que não existem no banco
            const savedIds = new Set(saved.map(m => m.id));
            const newMissions = DEFAULT_MISSIONS.filter(m => !savedIds.has(m.id));
            setMissions([...saved, ...newMissions]);
            return;
          }
        }
      } catch {
        // mantém padrão
      }
    };
    load();
  }, []);

  const persist = async (newMissions) => {
    setSaving(true);
    try {
      const existing = await base44.entities.SystemSetting.filter({ key: STORAGE_KEY });
      const payload = { key: STORAGE_KEY, value: JSON.stringify(newMissions) };
      if (existing?.length > 0) {
        await base44.entities.SystemSetting.update(existing[0].id, payload);
      } else {
        await base44.entities.SystemSetting.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['missions_templates_for_picker'] });
      toast.success('Missão salva!');
    } catch {
      toast.error('Erro ao salvar missão');
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (mission) => {
    setEditingId(mission.id);
    setEditData({ ...mission });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleEditSave = async () => {
    const newMissions = missions.map(m => m.id === editingId ? editData : m);
    setMissions(newMissions);
    setEditingId(null);
    setEditData(null);
    await persist(newMissions);
  };

  const handleFieldChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const linkedSprintName = (sprintId) => {
    const found = AVAILABLE_SPRINTS.find(s => s.id === sprintId);
    return found ? `${found.icon} ${found.name}` : '—';
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900">Missões do Sistema</h3>
        <p className="text-sm text-blue-700 mt-1">
          Cada missão pode ter um <strong>sprint vinculado</strong>. Quando o consultor iniciar essa missão para um cliente,
          o sprint vinculado será puxado automaticamente com todas as fases e tarefas configuradas.
        </p>
        {saving && <p className="text-xs text-blue-600 mt-2">💾 Salvando...</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map((mission) => (
          <div key={mission.id}>
            {editingId === mission.id ? (
              // ── Modo edição ──
              <Card className="border-blue-400 bg-blue-50 h-full">
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Ícone</label>
                    <Input
                      value={editData.icon}
                      onChange={(e) => handleFieldChange('icon', e.target.value)}
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Nome</label>
                    <Input
                      value={editData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Descrição</label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      className="mt-1 resize-none h-20"
                    />
                  </div>

                  {/* ── Sprint vinculado ── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Sprint vinculado</label>
                    <p className="text-xs text-gray-500 mb-1">
                      Ao iniciar esta missão, este sprint será puxado automaticamente.
                    </p>
                    <select
                      value={editData.linked_sprint_id || ''}
                      onChange={(e) => handleFieldChange('linked_sprint_id', e.target.value)}
                      className="w-full mt-1 border border-gray-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— Nenhum sprint vinculado —</option>
                      {AVAILABLE_SPRINTS.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleEditSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditCancel}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // ── Modo visualização ──
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">{mission.icon}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditStart(mission)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">{mission.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                      {mission.description}
                    </p>
                  </div>

                  {/* Sprint vinculado — badge */}
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Sprint vinculado:</p>
                    {mission.linked_sprint_id ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1">
                        {linkedSprintName(mission.linked_sprint_id)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Nenhum sprint vinculado</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}