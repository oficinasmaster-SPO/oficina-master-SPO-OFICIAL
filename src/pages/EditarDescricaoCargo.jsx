import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AIJobDescriptionAssistant from "../components/rh/AIJobDescriptionAssistant";

export default function EditarDescricaoCargo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobDescription, setJobDescription] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [formData, setFormData] = useState({
    job_title: "",
    previous_experience: [],
    education: [],
    knowledge: [],
    clients: [],
    main_activities: [],
    main_responsibilities: "",
    co_responsibilities: "",
    personal_attributes: [],
    inherent_risks: "",
    equipment_tools: [],
    managed_information: "",
    working_conditions: "",
    physical_effort: "",
    mental_effort: "",
    visual_effort: "",
    financial_transactions: "",
    third_party_safety: "",
    contact_responsibilities: "",
    indicators: [],
    trainings: []
  });

  useEffect(() => {
    loadJobDescription();
  }, []);

  const loadJobDescription = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("id");

      if (!id) {
        toast.error("Descrição de cargo não encontrada");
        navigate(createPageUrl("DescricoesCargo"));
        return;
      }

      const descriptions = await base44.entities.JobDescription.list();
      const current = descriptions.find(d => d.id === id);

      if (!current) {
        toast.error("Descrição de cargo não encontrada");
        navigate(createPageUrl("DescricoesCargo"));
        return;
      }

      setJobDescription(current);
      setFormData(current);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar descrição de cargo");
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerated = (data) => {
    setFormData(data);
    setShowAI(false);
    toast.success("Descrição atualizada pela IA!");
  };

  const handleSubmit = async () => {
    if (!formData.job_title) {
      toast.error("Preencha o título do cargo");
      return;
    }

    try {
      setSubmitting(true);
      await base44.entities.JobDescription.update(jobDescription.id, formData);
      toast.success("Descrição de cargo atualizada!");
      navigate(createPageUrl("DescricoesCargo"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar");
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

  if (!jobDescription) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(createPageUrl("DescricoesCargo"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => setShowAI(true)} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Regenerar com IA
          </Button>
        </div>

        {showAI ? (
          <AIJobDescriptionAssistant
            onGenerated={handleAIGenerated}
            initialData={{
              job_title: formData.job_title,
              main_responsibilities: formData.main_responsibilities,
              main_activities: formData.main_activities
            }}
          />
        ) : (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Editar Descrição de Cargo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título do Cargo</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                  placeholder="Ex: Mecânico de Manutenção"
                />
              </div>

              <div>
                <Label>Principais Responsabilidades</Label>
                <Textarea
                  value={formData.main_responsibilities}
                  onChange={(e) => setFormData({...formData, main_responsibilities: e.target.value})}
                  rows={4}
                  placeholder="Descreva as principais responsabilidades..."
                />
              </div>

              <div>
                <Label>Co-responsabilidades</Label>
                <Textarea
                  value={formData.co_responsibilities}
                  onChange={(e) => setFormData({...formData, co_responsibilities: e.target.value})}
                  rows={3}
                  placeholder="Descreva as co-responsabilidades..."
                />
              </div>

              <div>
                <Label>Condições de Trabalho</Label>
                <Textarea
                  value={formData.working_conditions}
                  onChange={(e) => setFormData({...formData, working_conditions: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>Esforço Físico</Label>
                <Input
                  value={formData.physical_effort}
                  onChange={(e) => setFormData({...formData, physical_effort: e.target.value})}
                />
              </div>

              <div>
                <Label>Esforço Mental</Label>
                <Input
                  value={formData.mental_effort}
                  onChange={(e) => setFormData({...formData, mental_effort: e.target.value})}
                />
              </div>

              <div>
                <Label>Esforço Visual</Label>
                <Input
                  value={formData.visual_effort}
                  onChange={(e) => setFormData({...formData, visual_effort: e.target.value})}
                />
              </div>

              <div>
                <Label>Riscos Inerentes</Label>
                <Textarea
                  value={formData.inherent_risks}
                  onChange={(e) => setFormData({...formData, inherent_risks: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate(createPageUrl("DescricoesCargo"))}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}