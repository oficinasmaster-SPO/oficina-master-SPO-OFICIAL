import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Target, Heart, Eye, Lightbulb, Users } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const PILLAR_TYPES = [
  { value: "proposito", label: "Propósito", icon: Target },
  { value: "valores", label: "Valores", icon: Heart },
  { value: "missao", label: "Missão", icon: Lightbulb },
  { value: "visao", label: "Visão", icon: Eye },
  { value: "comportamentos", label: "Comportamentos", icon: Users }
];

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

export default function PillarManager({ pillars, workshopId, onUpdate }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "valores",
    color: COLORS[0],
    target_frequency: "mensal"
  });

  const handleOpenDialog = (pillar = null) => {
    if (pillar) {
      setEditingPillar(pillar);
      setFormData({
        name: pillar.name,
        description: pillar.description || "",
        type: pillar.type,
        color: pillar.color,
        target_frequency: pillar.target_frequency || "mensal"
      });
    } else {
      setEditingPillar(null);
      setFormData({
        name: "",
        description: "",
        type: "valores",
        color: COLORS[0],
        target_frequency: "mensal"
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingPillar) {
        await base44.entities.CulturalPillar.update(editingPillar.id, formData);
        toast.success("Pilar atualizado!");
      } else {
        await base44.entities.CulturalPillar.create({
          ...formData,
          workshop_id: workshopId
        });
        toast.success("Pilar criado!");
      }
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar pilar:", error);
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async (pillarId) => {
    if (!confirm("Tem certeza que deseja excluir este pilar?")) return;

    try {
      await base44.entities.CulturalPillar.delete(pillarId);
      toast.success("Pilar excluído!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Pilares Culturais</h3>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pilar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars?.map(pillar => {
          const TypeIcon = PILLAR_TYPES.find(t => t.value === pillar.type)?.icon || Target;
          return (
            <Card key={pillar.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: pillar.color }}
                    >
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{pillar.name}</h4>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {PILLAR_TYPES.find(t => t.value === pillar.type)?.label}
                      </Badge>
                      {pillar.description && (
                        <p className="text-sm text-gray-600 mt-2">{pillar.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(pillar)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(pillar.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pillars?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Nenhum pilar cultural definido</p>
            <Button onClick={() => handleOpenDialog()}>
              Criar Primeiro Pilar
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPillar ? "Editar Pilar" : "Novo Pilar Cultural"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo do Pilar</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PILLAR_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome do Pilar *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Excelência no Atendimento"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva o significado deste pilar"
                rows={3}
              />
            </div>

            <div>
              <Label>Frequência Ideal</Label>
              <Select 
                value={formData.target_frequency} 
                onValueChange={(v) => setFormData({...formData, target_frequency: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cor de Identificação</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({...formData, color})}
                    className={`w-10 h-10 rounded-lg border-2 ${
                      formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    } transition-all`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}