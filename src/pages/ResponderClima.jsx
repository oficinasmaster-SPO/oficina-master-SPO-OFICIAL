import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Heart, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ResponderClima() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [invite, setInvite] = useState(null);
  const [survey, setSurvey] = useState(null);

  const [ratings, setRatings] = useState({
    leadership: { score: 0, feedback: "" },
    communication: { score: 0, feedback: "" },
    recognition: { score: 0, feedback: "" },
    development: { score: 0, feedback: "" },
    work_environment: { score: 0, feedback: "" },
    compensation: { score: 0, feedback: "" }
  });

  useEffect(() => {
    if (token) loadData();
    else setLoading(false);
  }, [token]);

  const loadData = async () => {
    try {
      const invites = await base44.entities.ClimateSurveyInvite.filter({ token });
      if (invites && invites.length > 0) {
        const inv = invites[0];
        setInvite(inv);
        
        if (inv.status === 'respondido') {
          setCompleted(true);
          setLoading(false);
          return;
        }

        const surveys = await base44.entities.CompanyClimate.filter({ id: inv.survey_id });
        if (surveys && surveys.length > 0) {
          setSurvey(surveys[0]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateRating = (dimension, field, value) => {
    setRatings({
      ...ratings,
      [dimension]: { ...ratings[dimension], [field]: value }
    });
  };

  const handleSubmit = async () => {
    const scores = Object.values(ratings).map(r => r.score);
    if (scores.some(s => s === 0)) {
      toast.error("Por favor, avalie todas as dimensões");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Add response to CompanyClimate (Anonymous aggregation)
      // We fetch fresh survey data to append
      const freshSurvey = await base44.entities.CompanyClimate.filter({ id: survey.id }).then(r => r[0]);
      const currentResponses = freshSurvey.employee_responses || [];
      
      const newResponse = {
        response_id: Math.random().toString(36).substr(2, 9), // Anonymous ID
        date: new Date().toISOString(),
        ratings: ratings,
        comments: Object.values(ratings).map(r => r.feedback).join(" | ")
      };

      await base44.entities.CompanyClimate.update(survey.id, {
        employee_responses: [...currentResponses, newResponse]
      });

      // 2. Mark invite as used (Tracking)
      await base44.entities.ClimateSurveyInvite.update(invite.id, {
        status: "respondido",
        responded_at: new Date().toISOString()
      });

      setCompleted(true);
      toast.success("Respostas enviadas com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar respostas");
    } finally {
      setSubmitting(false);
    }
  };

  const dimensions = [
    { key: "leadership", label: "Liderança", description: "Como você avalia seus líderes?" },
    { key: "communication", label: "Comunicação", description: "As informações circulam bem?" },
    { key: "recognition", label: "Reconhecimento", description: "Você se sente valorizado?" },
    { key: "development", label: "Desenvolvimento", description: "Existem oportunidades de crescer?" },
    { key: "work_environment", label: "Ambiente", description: "O clima entre colegas é bom?" },
    { key: "compensation", label: "Remuneração", description: "Salários e benefícios são justos?" }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;

  if (!token || !invite) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-gray-500">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-green-50">
        <Card className="w-full max-w-md text-center border-green-200 shadow-lg">
          <CardContent className="pt-10 pb-10">
            <Heart className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Obrigado!</h2>
            <p className="text-green-700">Sua participação é fundamental para construirmos um lugar melhor para todos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pesquisa de Clima</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-white inline-flex px-4 py-2 rounded-full shadow-sm border">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Suas respostas são confidenciais e anônimas
          </div>
        </div>

        <div className="space-y-6">
          {dimensions.map((dimension) => (
            <Card key={dimension.key} className="overflow-hidden">
              <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="text-lg text-gray-800">{dimension.label}</CardTitle>
                <CardDescription>{dimension.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 mb-2 px-1">
                    <span>Ruim</span>
                    <span>Excelente</span>
                  </div>
                  <div className="flex gap-1 justify-between">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => updateRating(dimension.key, "score", score)}
                        className={`flex-1 h-12 rounded-md font-bold text-sm transition-all border ${
                          ratings[dimension.key].score === score
                            ? "bg-green-600 text-white border-green-600 shadow-md scale-105"
                            : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-1.5 block">Comentário Opcional</Label>
                  <Textarea
                    value={ratings[dimension.key].feedback}
                    onChange={(e) => updateRating(dimension.key, "feedback", e.target.value)}
                    placeholder="Algo a acrescentar?"
                    className="resize-none text-sm"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={submitting} 
            className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6 h-auto w-full md:w-auto"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
            ) : (
              "Enviar Respostas"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}