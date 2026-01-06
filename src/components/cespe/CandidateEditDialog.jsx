import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function CandidateEditDialog({ open, onClose, candidate, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    city: "",
    neighborhood: "",
    desired_position: "",
    work_history: [],
    years_of_experience: 0,
    autonomous_activities: [],
    needs_support_activities: [],
    courses: [],
    self_technical_rating: 5,
    main_strength: "",
    improvement_point: "",
    reason_for_opportunity: "",
    long_term_expectations: "",
    best_leader: "",
    availability: "",
    salary_expectation: 0,
    previous_salary: 0,
    bad_month_salary_claim: "",
    salary_credibility_percentage: 0,
    desired_regime: "clt"
  });

  useEffect(() => {
    if (candidate) {
      setFormData({
        full_name: candidate.full_name || "",
        phone: candidate.phone || "",
        email: candidate.email || "",
        city: candidate.city || "",
        neighborhood: candidate.neighborhood || "",
        desired_position: candidate.desired_position || "",
        work_history: candidate.work_history || [],
        years_of_experience: candidate.years_of_experience || 0,
        autonomous_activities: candidate.autonomous_activities || [],
        needs_support_activities: candidate.needs_support_activities || [],
        courses: candidate.courses || [],
        self_technical_rating: candidate.self_technical_rating || 5,
        main_strength: candidate.main_strength || "",
        improvement_point: candidate.improvement_point || "",
        reason_for_opportunity: candidate.reason_for_opportunity || "",
        long_term_expectations: candidate.long_term_expectations || "",
        best_leader: candidate.best_leader || "",
        availability: candidate.availability || "",
        salary_expectation: candidate.salary_expectation || 0,
        previous_salary: candidate.previous_salary || 0,
        bad_month_salary_claim: candidate.bad_month_salary_claim || "",
        salary_credibility_percentage: candidate.salary_credibility_percentage || 0,
        desired_regime: candidate.desired_regime || "clt"
      });
    }
  }, [candidate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.phone || !formData.desired_position) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    onSave(formData);
  };

  const addWorkHistory = () => {
    setFormData({
      ...formData,
      work_history: [
        ...formData.work_history,
        { company_name: "", position: "", direct_leader: "", duration: "", reason_for_leaving: "" }
      ]
    });
  };

  const removeWorkHistory = (index) => {
    setFormData({
      ...formData,
      work_history: formData.work_history.filter((_, i) => i !== index)
    });
  };

  const updateWorkHistory = (index, field, value) => {
    const updated = [...formData.work_history];
    updated[index][field] = value;
    setFormData({ ...formData, work_history: updated });
  };

  const addCourse = () => {
    setFormData({
      ...formData,
      courses: [
        ...formData.courses,
        { course_name: "", institution: "", instructor: "", workload: "", last_update_year: "" }
      ]
    });
  };

  const removeCourse = (index) => {
    setFormData({
      ...formData,
      courses: formData.courses.filter((_, i) => i !== index)
    });
  };

  const updateCourse = (index, field, value) => {
    const updated = [...formData.courses];
    updated[index][field] = value;
    setFormData({ ...formData, courses: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✏️ Editar Cadastro Inicial - {candidate?.full_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="experiencia">Experiência</TabsTrigger>
              <TabsTrigger value="formacao">Formação</TabsTrigger>
              <TabsTrigger value="autopercep">Autopercepção</TabsTrigger>
              <TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger>
            </TabsList>

            {/* Tab 1: Identificação Básica */}
            <TabsContent value="identificacao" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-bold mb-4">1️⃣ Identificação Básica</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Telefone / WhatsApp *</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cargo Pretendido *</Label>
                    <Input
                      value={formData.desired_position}
                      onChange={(e) => setFormData({ ...formData, desired_position: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 2: Histórico Profissional */}
            <TabsContent value="historico" className="space-y-4">
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">2️⃣ Histórico Profissional (últimas 2-3 empresas)</h3>
                  <Button type="button" size="sm" onClick={addWorkHistory}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {formData.work_history.map((work, index) => (
                  <Card key={index} className="p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Empresa {index + 1}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeWorkHistory(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Nome da empresa"
                        value={work.company_name}
                        onChange={(e) => updateWorkHistory(index, 'company_name', e.target.value)}
                      />
                      <Input
                        placeholder="Cargo exercido"
                        value={work.position}
                        onChange={(e) => updateWorkHistory(index, 'position', e.target.value)}
                      />
                      <Input
                        placeholder="Líder direto"
                        value={work.direct_leader}
                        onChange={(e) => updateWorkHistory(index, 'direct_leader', e.target.value)}
                      />
                      <Input
                        placeholder="Tempo (ex: 2 anos)"
                        value={work.duration}
                        onChange={(e) => updateWorkHistory(index, 'duration', e.target.value)}
                      />
                      <Input
                        placeholder="Motivo da saída"
                        value={work.reason_for_leaving}
                        onChange={(e) => updateWorkHistory(index, 'reason_for_leaving', e.target.value)}
                        className="col-span-2"
                      />
                    </div>
                  </Card>
                ))}
              </Card>
            </TabsContent>

            {/* Tab 3: Experiência na Função */}
            <TabsContent value="experiencia" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-bold mb-4">3️⃣ Experiência na Função</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Anos de Experiência</Label>
                    <Input
                      type="number"
                      value={formData.years_of_experience}
                      onChange={(e) => setFormData({ ...formData, years_of_experience: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Atividades com Autonomia (uma por linha)</Label>
                    <Textarea
                      placeholder="Ex: Diagnóstico de motor&#10;Troca de óleo&#10;Revisão preventiva"
                      value={formData.autonomous_activities?.join('\n') || ''}
                      onChange={(e) => setFormData({ ...formData, autonomous_activities: e.target.value.split('\n').filter(a => a.trim()) })}
                      rows={5}
                    />
                  </div>
                  <div>
                    <Label>Atividades que Precisa Apoio (opcional)</Label>
                    <Textarea
                      placeholder="Ex: Reparo de câmbio automático&#10;Sistema de injeção eletrônica"
                      value={formData.needs_support_activities?.join('\n') || ''}
                      onChange={(e) => setFormData({ ...formData, needs_support_activities: e.target.value.split('\n').filter(a => a.trim()) })}
                      rows={3}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 4: Formação e Capacitação */}
            <TabsContent value="formacao" className="space-y-4">
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">4️⃣ Formação e Capacitação</h3>
                  <Button type="button" size="sm" onClick={addCourse}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Curso
                  </Button>
                </div>
                {formData.courses.map((course, index) => (
                  <Card key={index} className="p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Curso {index + 1}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeCourse(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Nome do curso"
                        value={course.course_name}
                        onChange={(e) => updateCourse(index, 'course_name', e.target.value)}
                      />
                      <Input
                        placeholder="Instituição/Escola"
                        value={course.institution}
                        onChange={(e) => updateCourse(index, 'institution', e.target.value)}
                      />
                      <Input
                        placeholder="Professor/Referência"
                        value={course.instructor}
                        onChange={(e) => updateCourse(index, 'instructor', e.target.value)}
                      />
                      <Input
                        placeholder="Carga horária"
                        value={course.workload}
                        onChange={(e) => updateCourse(index, 'workload', e.target.value)}
                      />
                      <Input
                        placeholder="Última atualização (ano)"
                        value={course.last_update_year}
                        onChange={(e) => updateCourse(index, 'last_update_year', e.target.value)}
                      />
                    </div>
                  </Card>
                ))}
              </Card>
            </TabsContent>

            {/* Tab 5: Autopercepção */}
            <TabsContent value="autopercep" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-bold mb-4">5️⃣ Autopercepção + Comportamento</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Autoavaliação Técnica (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.self_technical_rating}
                      onChange={(e) => setFormData({ ...formData, self_technical_rating: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Maior Ponto Forte</Label>
                    <Textarea
                      placeholder="Ex: Sou muito detalhista e minucioso nos diagnósticos"
                      value={formData.main_strength}
                      onChange={(e) => setFormData({ ...formData, main_strength: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Ponto a Evoluir</Label>
                    <Textarea
                      placeholder="Ex: Preciso melhorar a organização das ferramentas"
                      value={formData.improvement_point}
                      onChange={(e) => setFormData({ ...formData, improvement_point: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Por que busca nova oportunidade?</Label>
                    <Textarea
                      value={formData.reason_for_opportunity}
                      onChange={(e) => setFormData({ ...formData, reason_for_opportunity: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>O que espera de uma empresa para permanecer?</Label>
                    <Textarea
                      value={formData.long_term_expectations}
                      onChange={(e) => setFormData({ ...formData, long_term_expectations: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Melhor líder que teve e por quê?</Label>
                    <Textarea
                      value={formData.best_leader}
                      onChange={(e) => setFormData({ ...formData, best_leader: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 6: Disponibilidade e Condições */}
            <TabsContent value="disponibilidade" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-bold mb-4">7️⃣ Disponibilidade e Condições</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Disponibilidade de Início</Label>
                    <Input
                      placeholder="Ex: Imediato ou 30 dias"
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Pretensão Salarial (R$)</Label>
                    <Input
                      type="number"
                      value={formData.salary_expectation}
                      onChange={(e) => setFormData({ ...formData, salary_expectation: parseFloat(e.target.value) })}
                    />
                  </div>
                  
                  {/* Salário Anterior + Técnica de Provocação */}
                  <div className="border-t pt-4 mt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-yellow-800 font-medium">
                        💡 Técnica de Validação Salarial
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Pergunte: "Na empresa anterior, você ganhava quanto?"
                      </p>
                    </div>
                    
                    <div className="mb-3">
                      <Label>Salário na Empresa Anterior (R$)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 6000"
                        value={formData.previous_salary}
                        onChange={(e) => setFormData({ ...formData, previous_salary: parseFloat(e.target.value) })}
                      />
                    </div>

                    {formData.previous_salary > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-800 font-semibold mb-1">
                          🎯 PROVOQUE O CANDIDATO:
                        </p>
                        <p className="text-xs text-blue-700">
                          "Então no <strong>mês ruim</strong>, você ganhava quanto? R$ {(formData.previous_salary * 0.3).toFixed(0)} ~ R$ {(formData.previous_salary * 0.5).toFixed(0)}?"
                        </p>
                        <p className="text-xs text-blue-600 mt-2 italic">
                          (20-30% abaixo do valor declarado)
                        </p>
                      </div>
                    )}

                    <div className="mb-3">
                      <Label>Resposta sobre "Mês Ruim"</Label>
                      <Textarea
                        placeholder="Anote a resposta do candidato quando foi provocado sobre o salário no mês ruim..."
                        value={formData.bad_month_salary_claim}
                        onChange={(e) => setFormData({ ...formData, bad_month_salary_claim: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Credibilidade da Resposta (%)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.salary_credibility_percentage}
                          onChange={(e) => setFormData({ ...formData, salary_credibility_percentage: parseInt(e.target.value) })}
                          className="flex-1"
                        />
                        <span className="font-bold text-lg w-16 text-right">
                          {formData.salary_credibility_percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Quanto você acredita que a resposta foi verdadeira?
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Regime Desejado</Label>
                    <select
                      value={formData.desired_regime}
                      onChange={(e) => setFormData({ ...formData, desired_regime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="clt">CLT</option>
                      <option value="pj">PJ</option>
                      <option value="experiencia">Experiência</option>
                    </select>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}