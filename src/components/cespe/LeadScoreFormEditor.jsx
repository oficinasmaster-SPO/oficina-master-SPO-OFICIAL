import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, X, CheckSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ChecklistEditor from "./ChecklistEditor";

const blockLabels = {
  tecnico: "Técnico (40%)",
  comportamental: "Comportamental (30%)",
  cultural: "Cultural (15%)",
  historico: "Histórico/Risco (15%)"
};

const blockColors = {
  tecnico: "bg-blue-100 text-blue-800",
  comportamental: "bg-purple-100 text-purple-800",
  cultural: "bg-green-100 text-green-800",
  historico: "bg-orange-100 text-orange-800"
};

export default function LeadScoreFormEditor({ form, workshopId, onSaveComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    form_name: form?.form_name || "Lead Score - Qualificação de Candidato",
    description: form?.description || "",
    position: form?.position || "",
    scoring_criteria: form?.scoring_criteria || [],
    is_active: form?.is_active !== undefined ? form.is_active : true,
    is_lead_score_form: true,
    form_type: "lead_score"
  });

  const addCriteria = (block) => {
    setFormData({
      ...formData,
      scoring_criteria: [
        ...formData.scoring_criteria,
        {
          block,
          criteria_name: "",
          max_points: 5,
          weight: 1,
          question: "",
          scoring_guide: "",
          checklist_items: []
        }
      ]
    });
  };

  const updateCriteria = (index, field, value) => {
    const newCriteria = [...formData.scoring_criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setFormData({ ...formData, scoring_criteria: newCriteria });
  };

  const removeCriteria = (index) => {
    const newCriteria = formData.scoring_criteria.filter((_, i) => i !== index);
    setFormData({ ...formData, scoring_criteria: newCriteria });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        workshop_id: workshopId
      };

      if (form?.id) {
        return await base44.entities.InterviewForm.update(form.id, payload);
      } else {
        return await base44.entities.InterviewForm.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-forms'] });
      toast.success("Formulário Lead Score salvo!");
      onSaveComplete();
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao salvar formulário");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.form_name.trim()) {
      toast.error("Digite o nome do formulário");
      return;
    }
    if (formData.scoring_criteria.length === 0) {
      toast.error("Adicione pelo menos um critério");
      return;
    }
    saveMutation.mutate(formData);
  };

  const groupedCriteria = {
    tecnico: formData.scoring_criteria.filter(c => c.block === 'tecnico'),
    comportamental: formData.scoring_criteria.filter(c => c.block === 'comportamental'),
    cultural: formData.scoring_criteria.filter(c => c.block === 'cultural'),
    historico: formData.scoring_criteria.filter(c => c.block === 'historico')
  };

  const totalPoints = formData.scoring_criteria.reduce((sum, c) => sum + (c.max_points || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Nome do Formulário</Label>
            <Input
              value={formData.form_name}
              onChange={(e) => setFormData({...formData, form_name: e.target.value})}
              required
            />
          </div>

          <div>
            <Label>Cargo Específico (opcional)</Label>
            <Input
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              placeholder="Ex: Mecânico, Vendedor..."
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
            <span className="font-medium">Total de Pontos: {totalPoints}/100</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Ativo</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedCriteria).map(([block, criteria]) => (
        <Card key={block}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={blockColors[block]}>{blockLabels[block]}</Badge>
                <span className="text-sm text-gray-500">
                  {criteria.reduce((sum, c) => sum + (c.max_points || 0), 0)} pontos
                </span>
              </div>
              <Button type="button" size="sm" onClick={() => addCriteria(block)}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Critério
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criteria.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Nenhum critério neste bloco
              </p>
            ) : (
              formData.scoring_criteria.map((c, index) => {
                if (c.block !== block) return null;
                return (
                  <Card key={index} className="border-2">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Critério {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCriteria(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>

                      <div>
                        <Label>Nome do Critério</Label>
                        <Input
                          value={c.criteria_name}
                          onChange={(e) => updateCriteria(index, 'criteria_name', e.target.value)}
                          placeholder="Ex: Conhecimento técnico"
                          required
                        />
                      </div>

                      <div>
                        <Label>Template de Checklist (Opcional)</Label>
                        <select
                          value={c.checklist_template_id || ""}
                          onChange={(e) => updateCriteria(index, 'checklist_template_id', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">Selecione um template...</option>
                          <option value="auto">🤖 Detectar Automaticamente pelo Cargo</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Ao selecionar "Detectar Automaticamente", o sistema escolherá o checklist baseado no cargo do candidato
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Pontuação Máxima</Label>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={c.max_points}
                            onChange={(e) => updateCriteria(index, 'max_points', parseInt(e.target.value))}
                            required
                          />
                        </div>
                        <div>
                          <Label>Peso</Label>
                          <Input
                            type="number"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={c.weight}
                            onChange={(e) => updateCriteria(index, 'weight', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Pergunta para Avaliar</Label>
                        <Textarea
                          value={c.question}
                          onChange={(e) => updateCriteria(index, 'question', e.target.value)}
                          placeholder="Qual pergunta ajuda a avaliar esse critério?"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Guia de Pontuação</Label>
                        <Textarea
                          value={c.scoring_guide}
                          onChange={(e) => updateCriteria(index, 'scoring_guide', e.target.value)}
                          placeholder="Ex: 0-2: Insuficiente | 3-4: Bom | 5: Excelente"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                          <Label className="text-sm font-semibold text-blue-900">Checklist do Critério (Obrigatório)</Label>
                        </div>
                        <ChecklistEditor
                          items={c.checklist_items || []}
                          onChange={(items) => updateCriteria(index, "checklist_items", items)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Formulário"}
        </Button>
      </div>
    </form>
  );
}