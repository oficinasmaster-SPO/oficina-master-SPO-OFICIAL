import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProposalTemplateForm({ open, onClose, onBack, template, workshopId }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    template_name: "",
    position: "",
    reports_to: "",
    function_objective: "",
    main_responsibilities: [],
    secondary_responsibilities: [],
    contract_type: "clt",
    workload: "44h semanais",
    work_schedule: "08:00 - 18:00",
    work_location: "",
    work_model: "presencial",
    fixed_salary: 0,
    variable_bonus: 0,
    salary_readjustment: "",
    benefits: [],
    success_criteria_30d: "",
    success_criteria_60d: "",
    success_criteria_90d: "",
    career_path: "",
    future_positions: [],
    proposal_validity: "15 dias",
    responsible_contact: {
      name: "",
      email: "",
      phone: ""
    },
    is_active: true
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
      if (template?.id) {
        return await base44.entities.JobProposalTemplate.update(template.id, data);
      } else {
        return await base44.entities.JobProposalTemplate.create({
          ...data,
          workshop_id: workshopId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
      toast.success("Template salvo com sucesso!");
      onBack();
    }
  });

  const addItem = (field) => {
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), ""]
    });
  };

  const removeItem = (field, idx) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== idx)
    });
  };

  const updateItem = (field, idx, value) => {
    const newArray = [...formData[field]];
    newArray[idx] = value;
    setFormData({...formData, [field]: newArray});
  };

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [...(formData.benefits || []), { name: "", value: 0, description: "" }]
    });
  };

  const removeBenefit = (idx) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== idx)
    });
  };

  const updateBenefit = (idx, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[idx] = {...newBenefits[idx], [field]: value};
    setFormData({...formData, benefits: newBenefits});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle>
              {template ? 'Editar Template' : 'Novo Template de Proposta'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Template *</Label>
              <Input 
                value={formData.template_name} 
                onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                placeholder="Ex: Proposta Padrão - Mecânico"
              />
            </div>
            <div>
              <Label>Cargo *</Label>
              <Input 
                value={formData.position} 
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                placeholder="Ex: Mecânico Automotivo"
              />
            </div>
          </div>

          <Tabs defaultValue="cargo" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="cargo">Cargo</TabsTrigger>
              <TabsTrigger value="contratacao">Contratação</TabsTrigger>
              <TabsTrigger value="remuneracao">Remuneração</TabsTrigger>
              <TabsTrigger value="metas">Metas/Carreira</TabsTrigger>
            </TabsList>

            <TabsContent value="cargo" className="space-y-4">
              <div>
                <Label>Reporta para</Label>
                <Input 
                  value={formData.reports_to} 
                  onChange={(e) => setFormData({...formData, reports_to: e.target.value})}
                />
              </div>

              <div>
                <Label>Objetivo da Função</Label>
                <Textarea 
                  value={formData.function_objective} 
                  onChange={(e) => setFormData({...formData, function_objective: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Responsabilidades Principais</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => addItem('main_responsibilities')}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.main_responsibilities?.map((resp, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input 
                      value={resp} 
                      onChange={(e) => updateItem('main_responsibilities', idx, e.target.value)}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeItem('main_responsibilities', idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="contratacao" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modelo de Contratação</Label>
                  <Select value={formData.contract_type} onValueChange={(v) => setFormData({...formData, contract_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                      <SelectItem value="estagio">Estágio</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modelo de Trabalho</Label>
                  <Select value={formData.work_model} onValueChange={(v) => setFormData({...formData, work_model: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Carga Horária</Label>
                  <Input value={formData.workload} onChange={(e) => setFormData({...formData, workload: e.target.value})} />
                </div>
                <div>
                  <Label>Horário</Label>
                  <Input value={formData.work_schedule} onChange={(e) => setFormData({...formData, work_schedule: e.target.value})} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="remuneracao" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Salário Fixo (R$) *</Label>
                  <Input 
                    type="number" 
                    value={formData.fixed_salary} 
                    onChange={(e) => setFormData({...formData, fixed_salary: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Variável (R$)</Label>
                  <Input 
                    type="number" 
                    value={formData.variable_bonus} 
                    onChange={(e) => setFormData({...formData, variable_bonus: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Benefícios</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addBenefit}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.benefits?.map((benefit, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                    <Input 
                      placeholder="Nome" 
                      value={benefit.name} 
                      onChange={(e) => updateBenefit(idx, 'name', e.target.value)}
                    />
                    <Input 
                      type="number" 
                      placeholder="Valor" 
                      value={benefit.value} 
                      onChange={(e) => updateBenefit(idx, 'value', parseFloat(e.target.value) || 0)}
                    />
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Descrição" 
                        value={benefit.description} 
                        onChange={(e) => updateBenefit(idx, 'description', e.target.value)}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeBenefit(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="metas" className="space-y-4">
              <div>
                <Label>Critérios de Sucesso - 30 dias</Label>
                <Textarea 
                  value={formData.success_criteria_30d} 
                  onChange={(e) => setFormData({...formData, success_criteria_30d: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label>Plano de Carreira</Label>
                <Textarea 
                  value={formData.career_path} 
                  onChange={(e) => setFormData({...formData, career_path: e.target.value})}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              Cancelar
            </Button>
            <Button 
              onClick={() => saveTemplateMutation.mutate(formData)} 
              disabled={saveTemplateMutation.isPending || !formData.template_name || !formData.position}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveTemplateMutation.isPending ? "Salvando..." : "Salvar Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}