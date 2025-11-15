import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { entrepreneurQuestions } from "../components/entrepreneur/EntrepreneurQuestions";
import { toast } from "sonner";

export default function DiagnosticoEmpresario() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoEmpresario"));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentQuestion + 1) / entrepreneurQuestions.length) * 100;
  const question = entrepreneurQuestions[currentQuestion];

  const handleAnswer = (profile) => {
    setAnswers({ 
      ...answers, 
      [question.id]: profile
    });
  };

  const handleNext = () => {
    if (!answers[question.id]) {
      toast.error("Por favor, selecione uma resposta");
      return;
    }
    
    if (currentQuestion < entrepreneurQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const scores = { aventureiro: 0, empreendedor: 0, gestor: 0 };
      
      const answersArray = Object.entries(answers).map(([questionId, profile]) => {
        scores[profile]++;
        return {
          question_id: questionId,
          selected_profile: profile
        };
      });
      
      const dominantProfile = Object.keys(scores).reduce((a, b) => 
        scores[a] > scores[b] ? a : b
      );
      
      const diagnostic = await base44.entities.EntrepreneurDiagnostic.create({
        user_id: user.id,
        workshop_id: workshop?.id || null,
        answers: answersArray,
        dominant_profile: dominantProfile,
        profile_scores: scores,
        completed: true
      });
      
      toast.success("Diagnóstico concluído!");
      navigate(createPageUrl("ResultadoEmpresario") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Diagnóstico do Perfil do Empresário
              </h1>
              {workshop && (
                <p className="text-sm text-gray-600 mt-1">
                  {workshop.name}
                </p>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Pergunta {currentQuestion + 1} de {entrepreneurQuestions.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-xl border-2">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wider">
                {question.title}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                {question.question}
              </h2>
            </div>

            <div className="space-y-4">
              {question.options.map((option) => (
                <button
                  key={option.profile}
                  onClick={() => handleAnswer(option.profile)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    answers[question.id] === option.profile
                      ? "border-blue-600 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      answers[question.id] === option.profile
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {option.profile.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">
                        {option.text}
                      </p>
                      <p className="text-sm text-gray-600">
                        {option.description}
                      </p>
                    </div>
                    {answers[question.id] === option.profile && (
                      <CheckCircle2 className="flex-shrink-0 w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentQuestion === 0}
            className="px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!answers[question.id] || isSubmitting}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            {currentQuestion === entrepreneurQuestions.length - 1 ? (
              isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Finalizar"
              )
            ) : (
              <>
                Próxima
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}