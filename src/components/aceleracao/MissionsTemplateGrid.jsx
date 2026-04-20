import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Missões Padrão Globais
 */
const DEFAULT_MISSIONS = [
  {
    id: 'agenda_cheia',
    icon: '📅',
    name: 'Agenda Cheia',
    description: 'Preencher a agenda semanal com 100% de ocupação de vendas'
  },
  {
    id: 'fechamento_imbativel',
    icon: '🎯',
    name: 'Fechamento Imbatível',
    description: 'Aumentar taxa de conversão de propostas para vendas'
  },
  {
    id: 'caixa_forte',
    icon: '💰',
    name: 'Caixa Forte',
    description: 'Fortalecer fluxo de caixa e gestão financeira'
  },
  {
    id: 'empresa_organizada',
    icon: '📊',
    name: 'Empresa Organizada',
    description: 'Estruturar processos e operações da empresa'
  },
  {
    id: 'funcoes_claras',
    icon: '👥',
    name: 'Funções Claras',
    description: 'Definir papéis, responsabilidades e organograma'
  },
  {
    id: 'contratacao_certa',
    icon: '🎓',
    name: 'Contratação Certa',
    description: 'Otimizar processo de seleção e onboarding'
  },
  {
    id: 'cultura_forte',
    icon: '🌟',
    name: 'Cultura Forte',
    description: 'Desenvolver cultura organizacional e engajamento'
  }
];

export default function MissionsTemplateGrid() {
  const [missions, setMissions] = useState(DEFAULT_MISSIONS);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  const handleEditStart = (mission) => {
    setEditingId(mission.id);
    setEditData({ ...mission });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleEditSave = () => {
    setMissions(missions.map(m => m.id === editingId ? editData : m));
    setEditingId(null);
    setEditData(null);
  };

  const handleFieldChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900">Selecionar Missões</h3>
        <p className="text-sm text-blue-700 mt-1">
          Personalize conforme o diagnóstico do cliente. Estas são as missões padrão globais do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map((mission) => (
          <div key={mission.id}>
            {editingId === mission.id ? (
              // Modo edição
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

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleEditSave}
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
              // Modo visualização
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
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                      {mission.description}
                    </p>
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