import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import MissionPicker from '../MissionPicker';

export default function TrailCreateModal({ open, onClose, onCreate, creating }) {
  const [newTrail, setNewTrail] = useState({ nome_fase: '', objetivo_geral: '', missoes_selecionadas: [] });

  useEffect(() => {
    if (!open) {
      setNewTrail({ nome_fase: '', objetivo_geral: '', missoes_selecionadas: [] });
    }
  }, [open]);

  const handleCreate = () => {
    if (!newTrail.nome_fase.trim()) {
      toast.error('Informe o nome da trilha');
      return;
    }
    onCreate(newTrail);
    setNewTrail({ nome_fase: '', objetivo_geral: '', missoes_selecionadas: [] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Criando...' : 'Criar Trilha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}