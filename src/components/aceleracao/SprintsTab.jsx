import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import SprintsTemplateGrid from './SprintsTemplateGrid';
import SprintCreateModal from './modals/SprintCreateModal';

export default function SprintsTab({ workshopId, onAudit }) {
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreateSprint = async (data) => {
    setCreating(true);
    try {
      const mission_id = data.mission_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await base44.entities.SprintTemplate.create({
        mission_id,
        mission_icon: data.mission_icon,
        mission_name: data.mission_name,
        sprint_number: 1,
        title: `Sprint 1 — ${data.mission_name}`,
        objective: data.objective,
        phases: ['Planning', 'Execution', 'Monitoring', 'Review', 'Retrospective'].map(name => ({ name, tasks: [] })),
        is_template: true
      });
      queryClient.invalidateQueries({ queryKey: ['allConsultoriaSprints'] });
      onAudit?.('create_sprint', { sprint_name: data.mission_name });
      toast.success('Sprint criado!');
      setShowNewSprint(false);
    } catch (error) {
      console.error('Erro ao criar sprint:', error);
      toast.error('Erro ao criar sprint');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-800">Templates de Sprint por Missão</p>
            <p className="text-xs text-gray-500 mt-0.5">Configure as tarefas de cada fase. As edições são propagadas para os sprints dos clientes.</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewSprint(true)}
            className="gap-1.5 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Novo Sprint
          </Button>
        </div>
        <div className="p-5">
          <SprintsTemplateGrid workshopId={workshopId} onAudit={onAudit} />
        </div>
      </div>

      <SprintCreateModal
        open={showNewSprint}
        onClose={() => setShowNewSprint(false)}
        onCreate={handleCreateSprint}
        creating={creating}
      />
    </div>
  );
}