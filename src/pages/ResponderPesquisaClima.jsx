import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle2, TrendingUp, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ResponderPesquisaClima() {
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [survey, setSurvey] = useState(null);

  const [ratings, setRatings] = useState({
    leadership: { score: 0, feedback: "" },
    communication: { score: 0, feedback: "" },
    recognition: { score: 0, feedback: "" },
    development: { score: 0, feedback: "" },
    work_environment: { score: 0, feedback: "" },
    compensation: { score: 0, feedback: "" }
  });
  
  const [generalComments, setGeneralComments] = useState("");

  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    } else {
      setLoading(false);
    }
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
        // Since this is a public page, we might need a public way to fetch basic info.
        // RLS allows 'read' for everyone on CompanyClimate (based on schema).
        const data = await base44.entities.CompanyClimate.get(surveyId);
        if (data) {
            setSurvey(data);
        }
    } catch (error) {
        console.error(error);
        toast.error("Pesquisa não encontrada ou acesso negado.");
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
    // Validate all scores are filled
    const allRated = Object.values(ratings).every(r => r.score > 0);
    if (!allRated) {
      toast.error("Por favor, avalie todas as dimensões antes de enviar.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await base44.functions.invoke("submitClimateResponse", {
        survey_id: surveyId,
        responses: ratings,
        comments: generalComments
      });

      if (response.data.success) {
          setCompleted(true);
          toast.success("Resposta enviada com sucesso!");
      } else {
          toast.error("Erro ao enviar resposta: " + (response.data.error || "Erro desconhecido"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar resposta.");
    } finally {
      setSubmitting(false);
    }
  };

  const dimensions = [
    { key: "leadership", label: "Liderança", description: "Qualidade da gestão, liderança e relacionamento com supervisores." },
    { key: "communication", label: "Comunicação", description: "Clareza nas informações e abertura para diálogo." },
    { key: "recognition", label: "Reconhecimento", description: "Valorização do trabalho, feedback e celebração de conquistas." },
    { key: "development", label: "Desenvolvimento", description: "Oportunidades de aprendizado, treinamento e crescimento profissional." },
    { key: "work_environment", label: "Ambiente de Trabalho", description: "Segurança, recursos, clima entre colegas e bem-estar." },
    { key: "compensation", label: "Remuneração", description: "Satisfação com salário, benefícios e políticas de recompensa." }
  ];

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  }

  if (!survey || survey.status !== 'aberta') {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Pesquisa Não Disponível</h2>
            <p className="text-gray-500 mt-2">Esta pesquisa não existe ou já foi encerrada.</p>
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
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Obrigado!</h2>
            <p className="text-green-700">Sua resposta foi registrada com sucesso de forma anônima.</p>
            <p className="text-sm text-green-600 mt-4">Sua opinião é fundamental para melhorarmos nossa empresa.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-sm">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pesquisa de Clima</h1>
          <p className="text-gray-600">Sua opinião é 100% anônima e confidencial.</p>
        </div>

        <div className="space-y-6">
          {dimensions.map((dimension) => (
            <Card key={dimension.key} className="overflow-hidden border-l-4 border-l-green-500">
              <CardHeader className="bg-white/50">
                <CardTitle className="text-lg">{dimension.label}</CardTitle>
                <CardDescription>{dimension.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4">
                  <Label className="mb-2 block text-sm font-medium">Sua Avaliação (0 a 10)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => updateRating(dimension.key, "score", score)}
                        className={`w-10 h-10 rounded-full font-semibold transition-all border ${
                          ratings[dimension.key].score === score
                            ? "bg-green-600 text-white border-green-600 scale-110 shadow-md"
                            : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
                    <span>Muito Insatisfeito</span>
                    <span>Muito Satisfeito</span>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-1.5 block text-xs uppercase text-gray-500">Comentário Opcional</Label>
                  <Textarea
                    value={ratings[dimension.key].feedback}
                    onChange={(e) => updateRating(dimension.key, "feedback", e.target.value)}
                    placeholder="Algo específico que gostaria de pontuar?"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Comentários Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
                placeholder="Espaço livre para sugestões, críticas ou elogios..."
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting} 
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6 h-auto rounded-xl shadow-xl hover:shadow-2xl transition-all w-full sm:w-auto"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> Enviar Resposta Anônima</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}