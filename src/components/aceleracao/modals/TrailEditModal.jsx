import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import MissionPicker from '../MissionPicker';

export default function TrailEditModal({ trail, open, onClose, onSave, saving }) {
  const [editingTrail, setEditingTrail] = useState(trail);

  useEffect(() => {
    setEditingTrail(trail);
  }, [trail]);

  if (!trail) return null;

  const handleSave = () => {
    if (!editingTrail?.nome_fase?.trim()) {
      toast.error('Informe o nome da trilha');
      return;
    }
    onSave({
      nome_fase: editingTrail.nome_fase,
      objetivo_geral: editingTrail.objetivo_geral,
      missoes_selecionadas: editingTrail.missoes_selecionadas || [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}