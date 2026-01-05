import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  TrendingUp,
  Heart,
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PrimaryInfoForm({ open, onClose, candidate, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Identificação
    full_name: candidate?.full_name || "",
    phone: candidate?.phone || "",
    email: candidate?.email || "",
    city: candidate?.city || "",
    neighborhood: candidate?.neighborhood || "",
    desired_position: candidate?.desired_position || "",
    
    // Histórico profissional
    work_history: candidate?.work_history || [],
    
    // Experiência
    experience_years: candidate?.experience_years || 0,
    autonomous_activities: candidate?.autonomous_activities || [],
    needs_support_in: candidate?.needs_support_in || [],
    
    // Formação
    courses: candidate?.courses || [],
    
    // Autopercepção
    self_technical_rating: candidate?.self_technical_rating || 5,
    strongest_skill: candidate?.strongest_skill || "",
    improvement_area: candidate?.improvement_area || "",
    
    // Comportamento
    reason_for_change: candidate?.reason_for_change || "",
    company_expectations: candidate?.company_expectations || "",
    best_leader_experience: candidate?.best_leader_experience || "",
    
    // Disponibilidade
    availability: candidate?.availability || "",
    salary_expectation: candidate?.salary_expectation || 0,
    employment_type: candidate?.employment_type || "clt"
  });

  const addWorkHistory = () => {
    setFormData({
      ...formData,
      work_history: [...formData.work_history, {
        company_name: "",
        position: "",
        direct_leader: "",
        duration_months: 0,
        leaving_reason: ""
      }]
    });
  };

  const removeWorkHistory = (index) => {
    const newHistory = formData.work_history.filter((_, i) => i !== index);
    setFormData({ ...formData, work_history: newHistory });
  };

  const updateWorkHistory = (index, field, value) => {
    const newHistory = [...formData.work_history];
    newHistory[index][field] = value;
    setFormData({ ...formData, work_history: newHistory });
  };

  const addCourse = () => {
    setFormData({
      ...formData,
      courses: [...formData.courses, {
        course_name: "",
        institution: "",
        instructor: "",
        hours: 0,
        year: new Date().getFullYear()
      }]
    });
  };

  const removeCourse = (index) => {
    const newCourses = formData.courses.filter((_, i) => i !== index);
    setFormData({ ...formData, courses: newCourses });
  };

  const updateCourse = (index, field, value) => {
    const newCourses = [...formData.courses];
    newCourses[index][field] = value;
    setFormData({ ...formData, courses: newCourses });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calcular Lead Score inicial
      const scoreResponse = await base44.functions.invoke('calculateInitialLeadScore', {
        candidate_data: formData
      });

      const updatedData = {
        ...formData,
        initial_lead_score: scoreResponse.data.score,
        initial_form_completed: true,
        timeline: [
          ...(candidate.timeline || []),
          {
            timestamp: new Date().toISOString(),
            action: "Informações primárias atualizadas",
            details: `Lead Score inicial: ${scoreResponse.data.score}`
          }
        ]
      };

      await base44.entities.Candidate.update(candidate.id, updatedData);
      
      toast.success("Informações atualizadas! Lead Score: " + scoreResponse.data.score);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar informações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Informações Primárias - {candidate?.full_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Identificação Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Identificação Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
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
              <div>
                <Label>E-mail</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
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
              <div>
                <Label>Cargo Pretendido *</Label>
                <Input 
                  value={formData.desired_position}
                  onChange={(e) => setFormData({...formData, desired_position: e.target.value})}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Histórico Profissional */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Histórico Profissional
              </CardTitle>
              <Button type="button" size="sm" onClick={addWorkHistory}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.work_history.map((work, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeWorkHistory(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome da empresa"
                      value={work.company_name}
                      onChange={(e) => updateWorkHistory(idx, 'company_name', e.target.value)}
                    />
                    <Input
                      placeholder="Cargo"
                      value={work.position}
                      onChange={(e) => updateWorkHistory(idx, 'position', e.target.value)}
                    />
                    <Input
                      placeholder="Nome do líder direto"
                      value={work.direct_leader}
                      onChange={(e) => updateWorkHistory(idx, 'direct_leader', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Meses de permanência"
                      value={work.duration_months}
                      onChange={(e) => updateWorkHistory(idx, 'duration_months', parseInt(e.target.value))}
                    />
                  </div>
                  <Textarea
                    placeholder="Motivo da saída"
                    value={work.leaving_reason}
                    onChange={(e) => updateWorkHistory(idx, 'leaving_reason', e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. Experiência na Função */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Experiência na Função
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Anos de experiência na função</Label>
                <Input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({...formData, experience_years: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Atividades que executa com autonomia (separar por vírgula)</Label>
                <Textarea
                  value={formData.autonomous_activities.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData, 
                    autonomous_activities: e.target.value.split(',').map(s => s.trim())
                  })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Formação */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Formação e Capacitação
              </CardTitle>
              <Button type="button" size="sm" onClick={addCourse}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.courses.map((course, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeCourse(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome do curso"
                      value={course.course_name}
                      onChange={(e) => updateCourse(idx, 'course_name', e.target.value)}
                    />
                    <Input
                      placeholder="Instituição"
                      value={course.institution}
                      onChange={(e) => updateCourse(idx, 'institution', e.target.value)}
                    />
                    <Input
                      placeholder="Professor/Instrutor"
                      value={course.instructor}
                      onChange={(e) => updateCourse(idx, 'instructor', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Carga horária"
                      value={course.hours}
                      onChange={(e) => updateCourse(idx, 'hours', parseInt(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="Ano"
                      value={course.year}
                      onChange={(e) => updateCourse(idx, 'year', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5. Autopercepção */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Autopercepção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Avalie seu nível técnico (0-10)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.self_technical_rating}
                    onChange={(e) => setFormData({...formData, self_technical_rating: parseInt(e.target.value)})}
                    className="flex-1"
                  />
                  <Badge className="text-lg">{formData.self_technical_rating}</Badge>
                </div>
              </div>
              <div>
                <Label>Maior ponto forte na função</Label>
                <Input
                  value={formData.strongest_skill}
                  onChange={(e) => setFormData({...formData, strongest_skill: e.target.value})}
                />
              </div>
              <div>
                <Label>Ponto que precisa evoluir</Label>
                <Input
                  value={formData.improvement_area}
                  onChange={(e) => setFormData({...formData, improvement_area: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* 6. Comportamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Comportamento e Expectativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>O que te fez buscar uma nova oportunidade?</Label>
                <Textarea
                  value={formData.reason_for_change}
                  onChange={(e) => setFormData({...formData, reason_for_change: e.target.value})}
                  rows={2}
                />
              </div>
              <div>
                <Label>O que você espera de uma empresa?</Label>
                <Textarea
                  value={formData.company_expectations}
                  onChange={(e) => setFormData({...formData, company_expectations: e.target.value})}
                  rows={2}
                />
              </div>
              <div>
                <Label>Melhor líder que você teve e por quê</Label>
                <Textarea
                  value={formData.best_leader_experience}
                  onChange={(e) => setFormData({...formData, best_leader_experience: e.target.value})}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* 7. Disponibilidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Disponibilidade e Condições
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Disponibilidade de início</Label>
                <Input
                  value={formData.availability}
                  onChange={(e) => setFormData({...formData, availability: e.target.value})}
                  placeholder="Ex: Imediato, 15 dias, 30 dias"
                />
              </div>
              <div>
                <Label>Pretensão salarial (R$)</Label>
                <Input
                  type="number"
                  value={formData.salary_expectation}
                  onChange={(e) => setFormData({...formData, salary_expectation: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Regime desejado</Label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({...formData, employment_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="experiencia">Experiência</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar e Calcular Lead Score
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}