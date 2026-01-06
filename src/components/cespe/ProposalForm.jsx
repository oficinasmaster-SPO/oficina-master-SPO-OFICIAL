import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProposalForm({ proposal, candidate, workshop, onSave, isLoading }) {
  const [formData, setFormData] = useState({
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
    start_date: "",
    response_deadline: "",
    next_steps: "",
    proposal_validity: "15 dias",
    responsible_contact: {
      name: "",
      email: "",
      phone: ""
    },
    status: "rascunho"
  });

  useEffect(() => {
    if (proposal) {
      setFormData(proposal);
    } else if (candidate) {
      setFormData(prev => ({
        ...prev,
        position: candidate.desired_position || "",
        work_location: workshop?.city || ""
      }));
    }
  }, [proposal, candidate, workshop]);

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
    <Card className="p-6">
      <Tabs defaultValue="cargo" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
          <TabsTrigger value="contratacao">Contratação</TabsTrigger>
          <TabsTrigger value="remuneracao">Remuneração</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="crescimento">Crescimento</TabsTrigger>
        </TabsList>

        <TabsContent value="cargo" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cargo *</Label>
              <Input 
                value={formData.position} 
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                placeholder="Ex: Mecânico Automotivo"
              />
            </div>
            <div>
              <Label>Reporta para</Label>
              <Input 
                value={formData.reports_to} 
                onChange={(e) => setFormData({...formData, reports_to: e.target.value})}
                placeholder="Ex: Gerente de Operações"
              />
            </div>
          </div>

          <div>
            <Label>Objetivo da Função</Label>
            <Textarea 
              value={formData.function_objective} 
              onChange={(e) => setFormData({...formData, function_objective: e.target.value})}
              rows={3}
              placeholder="Qual é o resultado esperado desta função?"
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
                  placeholder="Descreva a responsabilidade"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeItem('main_responsibilities', idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Responsabilidades Secundárias</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => addItem('secondary_responsibilities')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.secondary_responsibilities?.map((resp, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input 
                  value={resp} 
                  onChange={(e) => updateItem('secondary_responsibilities', idx, e.target.value)}
                  placeholder="Descreva a responsabilidade"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeItem('secondary_responsibilities', idx)}>
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
              <Label>Carga Horária</Label>
              <Input value={formData.workload} onChange={(e) => setFormData({...formData, workload: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Horário de Trabalho</Label>
              <Input value={formData.work_schedule} onChange={(e) => setFormData({...formData, work_schedule: e.target.value})} />
            </div>
            <div>
              <Label>Modelo</Label>
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

          <div>
            <Label>Local de Trabalho</Label>
            <Input value={formData.work_location} onChange={(e) => setFormData({...formData, work_location: e.target.value})} />
          </div>
        </TabsContent>

        <TabsContent value="remuneracao" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Salário Fixo (R$) *</Label>
              <Input 
                type="number" 
                value={formData.fixed_salary} 
                onChange={(e) => setFormData({...formData, fixed_salary: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <Label>Variável/Comissão (R$)</Label>
              <Input 
                type="number" 
                value={formData.variable_bonus} 
                onChange={(e) => setFormData({...formData, variable_bonus: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <Label>Política de Reajuste</Label>
            <Textarea 
              value={formData.salary_readjustment} 
              onChange={(e) => setFormData({...formData, salary_readjustment: e.target.value})}
              rows={2}
              placeholder="Ex: Reajuste anual conforme índice da empresa"
            />
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
                  placeholder="Valor (R$)" 
                  value={benefit.value} 
                  onChange={(e) => updateBenefit(idx, 'value', parseFloat(e.target.value))}
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
              rows={3}
              placeholder="O que define sucesso nos primeiros 30 dias?"
            />
          </div>

          <div>
            <Label>Critérios de Sucesso - 60 dias</Label>
            <Textarea 
              value={formData.success_criteria_60d} 
              onChange={(e) => setFormData({...formData, success_criteria_60d: e.target.value})}
              rows={3}
            />
          </div>

          <div>
            <Label>Critérios de Sucesso - 90 dias</Label>
            <Textarea 
              value={formData.success_criteria_90d} 
              onChange={(e) => setFormData({...formData, success_criteria_90d: e.target.value})}
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="crescimento" className="space-y-4">
          <div>
            <Label>Plano de Carreira</Label>
            <Textarea 
              value={formData.career_path} 
              onChange={(e) => setFormData({...formData, career_path: e.target.value})}
              rows={3}
              placeholder="Como o colaborador pode crescer na empresa?"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Cargos Futuros</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => addItem('future_positions')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.future_positions?.map((pos, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input 
                  value={pos} 
                  onChange={(e) => updateItem('future_positions', idx, e.target.value)}
                  placeholder="Ex: Líder Técnico"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeItem('future_positions', idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início Prevista</Label>
              <Input 
                type="date" 
                value={formData.start_date} 
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Prazo para Resposta</Label>
              <Input 
                type="date" 
                value={formData.response_deadline} 
                onChange={(e) => setFormData({...formData, response_deadline: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Próximos Passos</Label>
            <Textarea 
              value={formData.next_steps} 
              onChange={(e) => setFormData({...formData, next_steps: e.target.value})}
              rows={2}
            />
          </div>

          <div>
            <Label>Validade da Proposta</Label>
            <Input 
              value={formData.proposal_validity} 
              onChange={(e) => setFormData({...formData, proposal_validity: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Responsável - Nome</Label>
              <Input 
                value={formData.responsible_contact?.name || ""} 
                onChange={(e) => setFormData({
                  ...formData, 
                  responsible_contact: {...formData.responsible_contact, name: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.responsible_contact?.email || ""} 
                onChange={(e) => setFormData({
                  ...formData, 
                  responsible_contact: {...formData.responsible_contact, email: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input 
                value={formData.responsible_contact?.phone || ""} 
                onChange={(e) => setFormData({
                  ...formData, 
                  responsible_contact: {...formData.responsible_contact, phone: e.target.value}
                })}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 pt-6 border-t">
        <Button onClick={() => onSave(formData)} disabled={isLoading} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Salvando..." : "Salvar Proposta"}
        </Button>
      </div>
    </Card>
  );
}