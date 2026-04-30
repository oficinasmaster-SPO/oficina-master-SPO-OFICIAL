import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function SprintCreateModal({ open, onClose, onCreate, creating }) {
  const [newSprint, setNewSprint] = useState({ mission_icon: '🚀', mission_name: '', objective: '' });

  useEffect(() => {
    if (!open) {
      setNewSprint({ mission_icon: '🚀', mission_name: '', objective: '' });
    }
  }, [open]);

  const handleCreate = () => {
    if (!newSprint.mission_name.trim()) {
      toast.error('Informe o nome da missão do sprint');
      return;
    }
    onCreate(newSprint);
    setNewSprint({ mission_icon: '🚀', mission_name: '', objective: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
          <p className="text-xs text-gray-500">O sprint será criado com 5 fases padrão sem tarefas. Configure as tarefas de cada fase diretamente na grade de Sprints.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Criando...' : 'Criar Sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}