import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckSquare, Save, X, Copy } from "lucide-react";
import { toast } from "sonner";
import ChecklistEditor from "./ChecklistEditor";

const jobRoleLabels = {
  tecnico: "Técnico/Mecânico",
  vendas: "Vendas/Consultor",
  telemarketing: "Telemarketing/Atendimento",
  estoque: "Estoque/Logística",
  financeiro: "Financeiro",
  administrativo: "Administrativo",
  gerente: "Gerente/Supervisor",
  outros: "Outros"
};

const checklistTypeLabels = {
  conhecimento_tecnico: "Conhecimento Técnico",
  experiencia_pratica: "Experiência Prática",
  capacidade_diagnostico: "Capacidade de Diagnóstico",
  habilidades_vendas: "Habilidades de Vendas",
  atendimento_cliente: "Atendimento ao Cliente",
  organizacao: "Organização",
  financeiro: "Financeiro",
  custom: "Customizado"
};

export default function ChecklistManager({ workshopId }) {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.ChecklistTemplate.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId
  });

  // Buscar formulário Lead Score para mostrar checklists existentes
  const { data: leadScoreForms = [] } = useQuery({
    queryKey: ['lead-score-forms', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.InterviewForm.filter({ 
        workshop_id: workshopId,
        is_lead_score_form: true 
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId
  });

  // Extrair checklists dos critérios do Lead Score
  const leadScoreChecklists = React.useMemo(() => {
    const checklists = [];
    leadScoreForms.forEach(form => {
      form.scoring_criteria?.forEach((criteria, index) => {
        if (criteria.checklist_items && criteria.checklist_items.length > 0) {
          console.log('📋 Criteria extraído:', {
            name: criteria.criteria_name,
            job_role: criteria.job_role,
            checklist_type: criteria.checklist_type
          });
          
          checklists.push({
            id: `form_${form.id}_criteria_${index}`,
            formId: form.id,
            criteriaIndex: index,
            template_name: criteria.criteria_name,
            job_role: criteria.job_role || 'tecnico',
            checklist_type: criteria.checklist_type || 'conhecimento_tecnico',
            items: criteria.checklist_items,
            description: criteria.question || '',
            is_active: true,
            isFromForm: true
          });
        }
      });
    });
    return checklists;
  }, [leadScoreForms]);

  // Combinar templates e checklists do formulário
  const allChecklists = [...templates, ...leadScoreChecklists];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Se for de um formulário Lead Score, atualizar o formulário
      if (editingTemplate?.isFromForm) {
        const form = await base44.entities.InterviewForm.get(editingTemplate.formId);
        const updatedCriteria = [...form.scoring_criteria];
        
        console.log('💾 Salvando criteria:', {
          index: editingTemplate.criteriaIndex,
          nome: data.template_name,
          job_role: data.job_role,
          checklist_type: data.checklist_type
        });
        
        // Atualizar o critério específico com TODOS os campos
        updatedCriteria[editingTemplate.criteriaIndex] = {
          ...updatedCriteria[editingTemplate.criteriaIndex],
          criteria_name: data.template_name,
          checklist_items: data.items,
          job_role: data.job_role,
          checklist_type: data.checklist_type
        };
        
        const result = await base44.entities.InterviewForm.update(editingTemplate.formId, {
          scoring_criteria: updatedCriteria
        });
        
        console.log('✅ Salvo! Criteria atualizado:', updatedCriteria[editingTemplate.criteriaIndex]);
        return result;
      }
      
      // Senão, salvar como template normal
      if (editingTemplate?.id && !editingTemplate?.isFromForm) {
        return await base44.entities.ChecklistTemplate.update(editingTemplate.id, data);
      } else {
        return await base44.entities.ChecklistTemplate.create({ ...data, workshop_id: workshopId });
      }
    },
    onSuccess: async () => {
      // Invalidar e aguardar refetch
      await queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-score-forms'] });
      await queryClient.refetchQueries({ queryKey: ['lead-score-forms'] });
      toast.success("Checklist atualizado!");
      setEditingTemplate(null);
      setIsCreating(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao salvar");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ChecklistTemplate.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success("Checklist excluído");
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao excluir");
    }
  });

  const handleCreate = () => {
    setEditingTemplate({
      template_name: "",
      job_role: "tecnico",
      checklist_type: "conhecimento_tecnico",
      items: [],
      description: "",
      is_active: true
    });
    setIsCreating(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const handleDuplicate = (template) => {
    setEditingTemplate({
      ...template,
      id: undefined,
      template_name: `${template.template_name} (Cópia)`
    });
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!editingTemplate.template_name.trim()) {
      toast.error("Digite o nome do checklist");
      return;
    }
    if (!editingTemplate.items || editingTemplate.items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    saveMutation.mutate(editingTemplate);
  };

  if (editingTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isCreating ? "Criar Novo Checklist" : "Editar Checklist"}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Nome do Checklist</Label>
              <Input
                value={editingTemplate.template_name}
                onChange={(e) => setEditingTemplate({...editingTemplate, template_name: e.target.value})}
                placeholder="Ex: Checklist Técnico Mecânico Senior"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <select
                  value={editingTemplate.job_role}
                  onChange={(e) => setEditingTemplate({...editingTemplate, job_role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Object.entries(jobRoleLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tipo de Checklist</Label>
                <select
                  value={editingTemplate.checklist_type}
                  onChange={(e) => setEditingTemplate({...editingTemplate, checklist_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Object.entries(checklistTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editingTemplate.description}
                onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                placeholder="Quando usar este checklist..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Itens do Checklist</Label>
              <div className="mt-2">
                <ChecklistEditor
                  items={editingTemplate.items}
                  onChange={(items) => setEditingTemplate({...editingTemplate, items})}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Checklists</h3>
          <p className="text-sm text-gray-600">Crie checklists personalizados por cargo</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Checklist
        </Button>
      </div>

      <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
        {allChecklists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Nenhum checklist criado</p>
              <Button onClick={handleCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Checklist
              </Button>
            </CardContent>
          </Card>
        ) : (
          allChecklists.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.template_name}
                      {template.isFromForm && <Badge className="bg-green-100 text-green-800">Do Lead Score</Badge>}
                      {!template.is_active && <Badge variant="outline">Inativo</Badge>}
                    </CardTitle>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {jobRoleLabels[template.job_role]}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        {checklistTypeLabels[template.checklist_type]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.items?.length || 0} itens
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!template.isFromForm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Excluir este checklist?")) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}