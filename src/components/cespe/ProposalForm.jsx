import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Plus, Trash2 } from "lucide-react";

export default function ProposalForm({ proposal, candidate, onSave, isLoading }) {
  const [formData, setFormData] = useState(proposal || {
    position: candidate?.desired_position || "",
    fixed_salary: 0,
    variable_bonus: 0,
    workload: "44h semanais",
    benefits: [],
    company_expectations: "",
    candidate_expectations: candidate?.expectations || "",
    status: "rascunho"
  });

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [...(formData.benefits || []), { name: "", value: 0 }]
    });
  };

  const removeBenefit = (idx) => {
    const newBenefits = formData.benefits.filter((_, i) => i !== idx);
    setFormData({...formData, benefits: newBenefits});
  };

  const updateBenefit = (idx, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[idx] = {...newBenefits[idx], [field]: value};
    setFormData({...formData, benefits: newBenefits});
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cargo</Label>
          <Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} />
        </div>
        <div>
          <Label>Jornada</Label>
          <Input value={formData.workload} onChange={(e) => setFormData({...formData, workload: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Salário Fixo (R$)</Label>
          <Input type="number" value={formData.fixed_salary} onChange={(e) => setFormData({...formData, fixed_salary: parseFloat(e.target.value)})} />
        </div>
        <div>
          <Label>Bônus/Variável (R$)</Label>
          <Input type="number" value={formData.variable_bonus} onChange={(e) => setFormData({...formData, variable_bonus: parseFloat(e.target.value)})} />
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
          <div key={idx} className="flex gap-2 mb-2">
            <Input 
              placeholder="Nome" 
              value={benefit.name} 
              onChange={(e) => updateBenefit(idx, 'name', e.target.value)}
            />
            <Input 
              type="number" 
              placeholder="Valor" 
              value={benefit.value} 
              onChange={(e) => updateBenefit(idx, 'value', parseFloat(e.target.value))}
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => removeBenefit(idx)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Label>Expectativas da Empresa</Label>
        <Textarea 
          value={formData.company_expectations} 
          onChange={(e) => setFormData({...formData, company_expectations: e.target.value})}
          rows={3}
        />
      </div>

      <div>
        <Label>Expectativas do Candidato</Label>
        <Textarea 
          value={formData.candidate_expectations} 
          onChange={(e) => setFormData({...formData, candidate_expectations: e.target.value})}
          rows={3}
        />
      </div>

      <Button onClick={() => onSave(formData)} disabled={isLoading} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {isLoading ? "Salvando..." : "Salvar Proposta"}
      </Button>
    </Card>
  );
}