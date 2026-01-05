import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EditCandidateDialog({ open, onClose, candidate }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: candidate?.full_name || "",
    phone: candidate?.phone || "",
    email: candidate?.email || "",
    city: candidate?.city || "",
    neighborhood: candidate?.neighborhood || "",
    desired_position: candidate?.desired_position || "",
    work_history: candidate?.work_history || [],
    experience_data: candidate?.experience_data || {
      years_experience: 0,
      autonomous_activities: [],
      support_needed: []
    },
    education: candidate?.education || [],
    self_assessment: candidate?.self_assessment || {
      technical_level: 5,
      main_strength: "",
      improvement_point: ""
    },
    behavioral_profile: candidate?.behavioral_profile || {
      reason_for_change: "",
      company_expectations: "",
      best_leader_experience: ""
    },
    availability: candidate?.availability || {
      start_availability: "",
      salary_expectation_range: "",
      desired_regime: "CLT"
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Candidate.update(candidate.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success("Candidato atualizado com sucesso!");
      onClose();
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao atualizar candidato");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const addWorkHistory = () => {
    setFormData({
      ...formData,
      work_history: [
        ...formData.work_history,
        {
          company_name: "",
          position: "",
          direct_manager: "",
          duration: "",
          leaving_reason: ""
        }
      ]
    });
  };

  const updateWorkHistory = (index, field, value) => {
    const newHistory = [...formData.work_history];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setFormData({ ...formData, work_history: newHistory });
  };

  const removeWorkHistory = (index) => {
    const newHistory = formData.work_history.filter((_, i) => i !== index);
    setFormData({ ...formData, work_history: newHistory });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [
        ...formData.education,
        {
          course_name: "",
          institution: "",
          instructor: "",
          hours: 0,
          last_update_year: new Date().getFullYear()
        }
      ]
    });
  };

  const updateEducation = (index, field, value) => {
    const newEducation = [...formData.education];
    newEducation[index] = { ...newEducation[index], [field]: value };
    setFormData({ ...formData, education: newEducation });
  };

  const removeEducation = (index) => {
    const newEducation = formData.education.filter((_, i) => i !== index);
    setFormData({ ...formData, education: newEducation });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Candidato - Pré-Análise</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. IDENTIFICAÇÃO BÁSICA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1️⃣ Identificação Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Telefone / WhatsApp *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Cargo Pretendido *</Label>
                  <Input
                    value={formData.desired_position}
                    onChange={(e) => setFormData({...formData, desired_position: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. HISTÓRICO PROFISSIONAL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                2️⃣ Histórico Profissional
                <Button type="button" size="sm" onClick={addWorkHistory}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Empresa
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.work_history.map((work, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeWorkHistory(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  <h4 className="font-semibold text-sm">Empresa {index + 1}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome da Empresa</Label>
                      <Input
                        value={work.company_name}
                        onChange={(e) => updateWorkHistory(index, 'company_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cargo Exercido</Label>
                      <Input
                        value={work.position}
                        onChange={(e) => updateWorkHistory(index, 'position', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Líder Direto</Label>
                      <Input
                        value={work.direct_manager}
                        onChange={(e) => updateWorkHistory(index, 'direct_manager', e.target.value)}
                        placeholder="Nome do gerente/proprietário"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tempo de Permanência</Label>
                      <Input
                        value={work.duration}
                        onChange={(e) => updateWorkHistory(index, 'duration', e.target.value)}
                        placeholder="Ex: 2 anos e 3 meses"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Motivo da Saída</Label>
                    <Input
                      value={work.leaving_reason}
                      onChange={(e) => updateWorkHistory(index, 'leaving_reason', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. EXPERIÊNCIA NA FUNÇÃO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3️⃣ Experiência na Função</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Anos de Experiência</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_data.years_experience}
                  onChange={(e) => setFormData({
                    ...formData,
                    experience_data: {
                      ...formData.experience_data,
                      years_experience: parseFloat(e.target.value) || 0
                    }
                  })}
                />
              </div>
              <div>
                <Label>Atividades com Autonomia (uma por linha)</Label>
                <Textarea
                  rows={3}
                  value={formData.experience_data.autonomous_activities?.join('\n') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    experience_data: {
                      ...formData.experience_data,
                      autonomous_activities: e.target.value.split('\n').filter(l => l.trim())
                    }
                  })}
                  placeholder="Ex: Troca de óleo&#10;Alinhamento e balanceamento&#10;Diagnóstico elétrico"
                />
              </div>
              <div>
                <Label>Atividades que Precisa de Apoio</Label>
                <Textarea
                  rows={2}
                  value={formData.experience_data.support_needed?.join('\n') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    experience_data: {
                      ...formData.experience_data,
                      support_needed: e.target.value.split('\n').filter(l => l.trim())
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. FORMAÇÃO E CAPACITAÇÃO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                4️⃣ Formação e Capacitação
                <Button type="button" size="sm" onClick={addEducation}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Curso
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.education.map((edu, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeEducation(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  <h4 className="font-semibold text-sm">Curso {index + 1}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome do Curso</Label>
                      <Input
                        value={edu.course_name}
                        onChange={(e) => updateEducation(index, 'course_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Instituição/Escola</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Professor/Referência</Label>
                      <Input
                        value={edu.instructor}
                        onChange={(e) => updateEducation(index, 'instructor', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Carga Horária</Label>
                      <Input
                        type="number"
                        value={edu.hours}
                        onChange={(e) => updateEducation(index, 'hours', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Última Atualização (Ano)</Label>
                      <Input
                        type="number"
                        value={edu.last_update_year}
                        onChange={(e) => updateEducation(index, 'last_update_year', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5. AUTOPERCEPÇÃO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5️⃣ Autopercepção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nível Técnico (0-10)</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.self_assessment.technical_level}
                    onChange={(e) => setFormData({
                      ...formData,
                      self_assessment: {
                        ...formData.self_assessment,
                        technical_level: parseInt(e.target.value)
                      }
                    })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-blue-600 min-w-[40px]">
                    {formData.self_assessment.technical_level}
                  </span>
                </div>
              </div>
              <div>
                <Label>Maior Ponto Forte</Label>
                <Input
                  value={formData.self_assessment.main_strength}
                  onChange={(e) => setFormData({
                    ...formData,
                    self_assessment: {
                      ...formData.self_assessment,
                      main_strength: e.target.value
                    }
                  })}
                />
              </div>
              <div>
                <Label>Ponto que Precisa Evoluir</Label>
                <Input
                  value={formData.self_assessment.improvement_point}
                  onChange={(e) => setFormData({
                    ...formData,
                    self_assessment: {
                      ...formData.self_assessment,
                      improvement_point: e.target.value
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 6. COMPORTAMENTO E EXPECTATIVA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">6️⃣ Comportamento e Expectativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Por que busca nova oportunidade?</Label>
                <Textarea
                  rows={2}
                  value={formData.behavioral_profile.reason_for_change}
                  onChange={(e) => setFormData({
                    ...formData,
                    behavioral_profile: {
                      ...formData.behavioral_profile,
                      reason_for_change: e.target.value
                    }
                  })}
                />
              </div>
              <div>
                <Label>O que espera de uma empresa para permanecer nela por anos?</Label>
                <Textarea
                  rows={2}
                  value={formData.behavioral_profile.company_expectations}
                  onChange={(e) => setFormData({
                    ...formData,
                    behavioral_profile: {
                      ...formData.behavioral_profile,
                      company_expectations: e.target.value
                    }
                  })}
                />
              </div>
              <div>
                <Label>Melhor líder que já teve? Por quê?</Label>
                <Textarea
                  rows={2}
                  value={formData.behavioral_profile.best_leader_experience}
                  onChange={(e) => setFormData({
                    ...formData,
                    behavioral_profile: {
                      ...formData.behavioral_profile,
                      best_leader_experience: e.target.value
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 7. DISPONIBILIDADE E CONDIÇÕES */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">7️⃣ Disponibilidade e Condições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Disponibilidade de Início</Label>
                  <Input
                    value={formData.availability.start_availability}
                    onChange={(e) => setFormData({
                      ...formData,
                      availability: {
                        ...formData.availability,
                        start_availability: e.target.value
                      }
                    })}
                    placeholder="Ex: Imediato, 15 dias..."
                  />
                </div>
                <div>
                  <Label>Pretensão Salarial (Faixa)</Label>
                  <Input
                    value={formData.availability.salary_expectation_range}
                    onChange={(e) => setFormData({
                      ...formData,
                      availability: {
                        ...formData.availability,
                        salary_expectation_range: e.target.value
                      }
                    })}
                    placeholder="Ex: R$ 2.000 - R$ 2.500"
                  />
                </div>
              </div>
              <div>
                <Label>Regime Desejado</Label>
                <select
                  value={formData.availability.desired_regime}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: {
                      ...formData.availability,
                      desired_regime: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="CLT">CLT</option>
                  <option value="PJ">PJ</option>
                  <option value="Experiencia">Experiência</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}