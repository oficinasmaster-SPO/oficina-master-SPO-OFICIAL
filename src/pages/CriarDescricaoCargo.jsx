import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AIJobDescriptionAssistant from "../components/rh/AIJobDescriptionAssistant";

export default function CriarDescricaoCargo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showAI, setShowAI] = useState(true);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (userWorkshop) {
        setWorkshop(userWorkshop);
      }
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("CriarDescricaoCargo"));
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerated = (data) => {
    setFormData({
      workshop_id: workshop.id,
      ...data
    });
    setShowAI(false);
    toast.success("Use o botão salvar para confirmar");
  };

  const handleSubmit = async () => {
    if (!formData) {
      toast.error("Gere uma descrição primeiro");
      return;
    }

    setSubmitting(true);

    try {
      await base44.entities.JobDescription.create(formData);
      toast.success("Descrição de cargo salva!");
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Criar Descrição de Cargo com IA
          </h1>
          <p className="text-gray-600">
            Modelo Oficinas Master - Geração automatizada completa
          </p>
        </div>

        <div className="space-y-6">
          {showAI ? (
            <AIJobDescriptionAssistant onGenerated={handleAIGenerated} />
          ) : (
            <>
              <Card className="shadow-lg border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    ✅ Descrição Gerada com Sucesso!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Cargo:</p>
                      <p className="text-lg font-bold text-gray-900">{formData.job_title}</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">Principais Atividades:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {formData.main_activities?.slice(0, 5).map((activity, i) => (
                          <li key={i} className="text-sm text-gray-600">{activity}</li>
                        ))}
                        {formData.main_activities?.length > 5 && (
                          <li className="text-sm text-gray-500 italic">
                            ...e mais {formData.main_activities.length - 5} atividades
                          </li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">Treinamentos Recomendados:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.trainings?.map((training, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {training}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-800">
                        <strong>📋 Descrição completa gerada:</strong> Todos os campos do formulário Oficinas Master foram preenchidos pela IA.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAI(true);
                    setFormData(null);
                  }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Outra Descrição
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
                  ) : (
                    <><Save className="w-5 h-5 mr-2" /> Salvar Descrição de Cargo</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}