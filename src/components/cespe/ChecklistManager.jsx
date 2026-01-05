import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, List, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ChecklistManager({ open, onClose, workshopId }) {
  const queryClient = useQueryClient();
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: checklists = [] } = useQuery({
    queryKey: ['technical-checklists', workshopId],
    queryFn: async () => {
      const all = await base44.entities.TechnicalChecklist.filter({ is_active: true });
      return all.filter(c => !c.workshop_id || c.workshop_id === workshopId);
    },
    enabled: !!workshopId && open
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingChecklist?.id) {
        return await base44.entities.TechnicalChecklist.update(editingChecklist.id, data);
      }
      return await base44.entities.TechnicalChecklist.create({
        ...data,
        workshop_id: workshopId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-checklists'] });
      toast.success("Checklist salvo!");
      setShowEditor(false);
      setEditingChecklist(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TechnicalChecklist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-checklists'] });
      toast.success("Checklist removido!");
    }
  });

  const handleCreateNew = () => {
    setEditingChecklist({
      checklist_name: "",
      checklist_type: "custom",
      position: "",
      description: "",
      question_text: "",
      categories: [],
      scoring_impact: 10,
      associated_criteria: []
    });
    setShowEditor(true);
  };

  if (showEditor) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChecklist?.id ? "Editar Checklist" : "Novo Checklist"}
            </DialogTitle>
          </DialogHeader>
          <ChecklistEditor
            checklist={editingChecklist}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => {
              setShowEditor(false);
              setEditingChecklist(null);
            }}
            isLoading={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <List className="w-6 h-6" />
              Gerenciar Checklists Técnicos
            </span>
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Checklist
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {checklists.map((checklist) => (
            <Card key={checklist.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{checklist.checklist_name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{checklist.checklist_type}</Badge>
                      {checklist.position && <Badge>{checklist.position}</Badge>}
                      <Badge className="bg-blue-100 text-blue-800">
                        Impacto: {checklist.scoring_impact} pts
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingChecklist(checklist);
                        setShowEditor(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!checklist.is_system_default && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Deseja remover este checklist?")) {
                            deleteMutation.mutate(checklist.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{checklist.question_text}</p>
                <div className="flex flex-wrap gap-2">
                  {checklist.categories?.map((cat, idx) => (
                    <Badge key={idx} variant="outline">
                      {cat.name} ({cat.items?.length || 0} itens)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {checklists.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <List className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nenhum checklist criado ainda</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistEditor({ checklist, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(checklist || {
    checklist_name: "",
    checklist_type: "custom",
    position: "",
    description: "",
    question_text: "",
    categories: [],
    scoring_impact: 10,
    associated_criteria: []
  });

  const addCategory = () => {
    setFormData({
      ...formData,
      categories: [...formData.categories, {
        name: "",
        items: [],
        weight: 1
      }]
    });
  };

  const removeCategory = (index) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter((_, i) => i !== index)
    });
  };

  const updateCategory = (index, field, value) => {
    const newCategories = [...formData.categories];
    newCategories[index][field] = value;
    setFormData({ ...formData, categories: newCategories });
  };

  const addItem = (categoryIndex) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].items.push("");
    setFormData({ ...formData, categories: newCategories });
  };

  const removeItem = (categoryIndex, itemIndex) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].items = newCategories[categoryIndex].items.filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, categories: newCategories });
  };

  const updateItem = (categoryIndex, itemIndex, value) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].items[itemIndex] = value;
    setFormData({ ...formData, categories: newCategories });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Nome do Checklist *</Label>
          <Input
            value={formData.checklist_name}
            onChange={(e) => setFormData({...formData, checklist_name: e.target.value})}
            placeholder="Ex: Checklist Mecânico"
            required
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <select
            value={formData.checklist_type}
            onChange={(e) => setFormData({...formData, checklist_type: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="conhecimento_tecnico">Conhecimento Técnico</option>
            <option value="experiencia_pratica">Experiência Prática</option>
            <option value="capacidade_diagnostico">Capacidade de Diagnóstico</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        <div>
          <Label>Cargo Específico</Label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            placeholder="Ex: Mecânico, Eletricista"
          />
        </div>
        <div>
          <Label>Impacto no Lead Score (pontos)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.scoring_impact}
            onChange={(e) => setFormData({...formData, scoring_impact: parseInt(e.target.value)})}
          />
        </div>
      </div>

      <div>
        <Label>Pergunta Principal</Label>
        <Input
          value={formData.question_text}
          onChange={(e) => setFormData({...formData, question_text: e.target.value})}
          placeholder="Ex: Você possui conhecimento sobre..."
        />
      </div>

      <div>
        <Label>Critérios Associados (separar por vírgula)</Label>
        <Input
          value={formData.associated_criteria?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData, 
            associated_criteria: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          })}
          placeholder="Ex: Conhecimento Técnico, Experiências Práticas"
        />
        <p className="text-xs text-gray-500 mt-1">
          Checklist aparecerá quando o nome do critério contiver estas palavras
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-lg">Categorias e Itens</Label>
          <Button type="button" onClick={addCategory} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Categoria
          </Button>
        </div>

        <div className="space-y-4">
          {formData.categories.map((category, catIdx) => (
            <Card key={catIdx} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={category.name}
                    onChange={(e) => updateCategory(catIdx, 'name', e.target.value)}
                    placeholder="Nome da categoria"
                    className="font-semibold"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(catIdx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="text-sm">Peso:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={category.weight}
                    onChange={(e) => updateCategory(catIdx, 'weight', parseFloat(e.target.value))}
                    className="w-20"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addItem(catIdx)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {category.items?.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateItem(catIdx, itemIdx, e.target.value)}
                        placeholder="Descrição do item"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(catIdx, itemIdx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={() => onSave(formData)}
          disabled={isLoading || !formData.checklist_name || formData.categories.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Salvando..." : "Salvar Checklist"}
        </Button>
      </div>
    </div>
  );
}