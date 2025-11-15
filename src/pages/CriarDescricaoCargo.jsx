import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CriarDescricaoCargo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [user, setUser] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  
  const [formData, setFormData] = useState({
    workshop_id: "",
    job_title: "",
    previous_experience: [],
    education: [],
    knowledge: [],
    clients: [],
    main_activities: [""],
    main_responsibilities: "",
    co_responsibilities: "",
    personal_attributes: [],
    inherent_risks: "",
    equipment_tools: [""],
    managed_information: "",
    working_conditions: "",
    physical_effort: "",
    mental_effort: "",
    visual_effort: "",
    financial_transactions: "",
    third_party_safety: "",
    contact_responsibilities: "",
    indicators: [],
    trainings: [""]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const allWorkshops = await base44.entities.Workshop.list();
      setWorkshops(allWorkshops);
      
      if (allWorkshops.length > 0) {
        const userWorkshop = allWorkshops.find(w => w.owner_id === currentUser.id);
        if (userWorkshop) {
          setFormData(prev => ({ ...prev, workshop_id: userWorkshop.id }));
        }
      }
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("CriarDescricaoCargo"));
    } finally {
      setLoading(false);
    }
  };

  const addArrayItem = (field, defaultValue = "") => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], defaultValue]
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addChecklistItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], { item: "", required: false, desired: false }]
    }));
  };

  const removeChecklistItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateChecklistItem = (field, index, property, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => 
        i === index ? { ...item, [property]: value } : item
      )
    }));
  };

  const generateWithAI = async () => {
    if (!formData.job_title) {
      toast.error("Digite o nome do cargo primeiro");
      return;
    }

    setGeneratingAI(true);

    try {
      const prompt = `
Você é um especialista em RH para oficinas automotivas da metodologia Oficinas Master.
Gere uma descrição de cargo COMPLETA para o cargo de: ${formData.job_title}

Forneça os dados estruturados no seguinte formato JSON:

{
  "previous_experience": [
    {"item": "Exemplo de experiência", "required": true/false, "desired": true/false}
  ],
  "education": [
    {"item": "Formação", "required": true/false, "desired": true/false}
  ],
  "knowledge": [
    {"item": "Conhecimento específico", "required": true/false, "desired": true/false}
  ],
  "clients": [
    {"item": "Nome do cliente", "internal": true/false, "external": true/false}
  ],
  "main_activities": ["Atividade 1", "Atividade 2", ...],
  "main_responsibilities": "Texto descritivo",
  "co_responsibilities": "Texto descritivo",
  "personal_attributes": [
    {"item": "Atributo", "required": true/false, "desired": true/false}
  ],
  "inherent_risks": "Texto descritivo",
  "equipment_tools": ["Ferramenta 1", "Ferramenta 2", ...],
  "working_conditions": "Texto descritivo",
  "physical_effort": "Texto descritivo",
  "mental_effort": "Texto descritivo",
  "visual_effort": "Texto descritivo",
  "contact_responsibilities": "Texto descritivo",
  "indicators": [
    {"item": "Indicador", "required": true/false, "desired": true/false}
  ],
  "trainings": ["Treinamento 1", "Treinamento 2", ...]
}

Seja específico e detalhado conforme a metodologia Oficinas Master.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            previous_experience: { type: "array" },
            education: { type: "array" },
            knowledge: { type: "array" },
            clients: { type: "array" },
            main_activities: { type: "array" },
            main_responsibilities: { type: "string" },
            co_responsibilities: { type: "string" },
            personal_attributes: { type: "array" },
            inherent_risks: { type: "string" },
            equipment_tools: { type: "array" },
            working_conditions: { type: "string" },
            physical_effort: { type: "string" },
            mental_effort: { type: "string" },
            visual_effort: { type: "string" },
            contact_responsibilities: { type: "string" },
            indicators: { type: "array" },
            trainings: { type: "array" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        ...response,
        generated_by_ai: true
      }));

      toast.success("Descrição gerada com IA!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar com IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.job_title) {
      toast.error("Digite o nome do cargo");
      return;
    }

    setSubmitting(true);

    try {
      const cleanedData = {
        ...formData,
        main_activities: formData.main_activities.filter(a => a.trim() !== ""),
        equipment_tools: formData.equipment_tools.filter(t => t.trim() !== ""),
        trainings: formData.trainings.filter(t => t.trim() !== "")
      };

      await base44.entities.JobDescription.create(cleanedData);

      toast.success("Descrição de cargo criada!");
      navigate(createPageUrl("DescricoesCargo"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Criar Descrição de Cargo
          </h1>
          <p className="text-lg text-gray-600">
            Formulário completo baseado na metodologia Oficinas Master
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Oficina *</Label>
                <Select value={formData.workshop_id} onValueChange={(value) => setFormData({...formData, workshop_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nome do Cargo *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Marketing Interno"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    required
                  />
                  <Button
                    type="button"
                    onClick={generateWithAI}
                    disabled={generatingAI || !formData.job_title}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {generatingAI ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Gerando...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-1" /> Gerar com IA</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Atividades Principais */}
          <Card>
            <CardHeader>
              <CardTitle>Principais Atividades do Cargo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.main_activities.map((activity, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Descreva uma atividade"
                    value={activity}
                    onChange={(e) => updateArrayItem('main_activities', index, e.target.value)}
                  />
                  {formData.main_activities.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('main_activities', index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('main_activities', "")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Atividade
              </Button>
            </CardContent>
          </Card>

          {/* Responsabilidades */}
          <Card>
            <CardHeader>
              <CardTitle>Responsabilidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Principais Responsabilidades</Label>
                <Textarea
                  placeholder="Descreva as principais responsabilidades"
                  value={formData.main_responsibilities}
                  onChange={(e) => setFormData({...formData, main_responsibilities: e.target.value})}
                  rows={4}
                />
              </div>
              <div>
                <Label>Co-responsabilidades</Label>
                <Textarea
                  placeholder="Descreva as co-responsabilidades"
                  value={formData.co_responsibilities}
                  onChange={(e) => setFormData({...formData, co_responsibilities: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Condições de Trabalho */}
          <Card>
            <CardHeader>
              <CardTitle>Condições de Trabalho e Esforços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Condições de Trabalho</Label>
                <Input
                  placeholder="Ex: Em sala organizada e refrigerada"
                  value={formData.working_conditions}
                  onChange={(e) => setFormData({...formData, working_conditions: e.target.value})}
                />
              </div>
              <div>
                <Label>Esforço Físico</Label>
                <Input
                  placeholder="Descreva o esforço físico"
                  value={formData.physical_effort}
                  onChange={(e) => setFormData({...formData, physical_effort: e.target.value})}
                />
              </div>
              <div>
                <Label>Esforço Mental</Label>
                <Input
                  placeholder="Descreva o esforço mental"
                  value={formData.mental_effort}
                  onChange={(e) => setFormData({...formData, mental_effort: e.target.value})}
                />
              </div>
              <div>
                <Label>Esforço Visual</Label>
                <Input
                  placeholder="Ex: Uso de computadores e monitores"
                  value={formData.visual_effort}
                  onChange={(e) => setFormData({...formData, visual_effort: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos e Ferramentas */}
          <Card>
            <CardHeader>
              <CardTitle>Máquinas, Equipamentos e Ferramentas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.equipment_tools.map((tool, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Ex: Notebook, Celular, etc."
                    value={tool}
                    onChange={(e) => updateArrayItem('equipment_tools', index, e.target.value)}
                  />
                  {formData.equipment_tools.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('equipment_tools', index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('equipment_tools', "")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Ferramenta
              </Button>
            </CardContent>
          </Card>

          {/* Treinamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Treinamentos Necessários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.trainings.map((training, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome do treinamento"
                    value={training}
                    onChange={(e) => updateArrayItem('trainings', index, e.target.value)}
                  />
                  {formData.trainings.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('trainings', index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('trainings', "")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Treinamento
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("DescricoesCargo"))}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 px-8"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Salvar Descrição</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}