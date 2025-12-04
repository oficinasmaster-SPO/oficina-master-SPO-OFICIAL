import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, History, Play, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
  const [viewMode, setViewMode] = useState("history"); // "history" or "new"

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      let loadedWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (!loadedWorkshop) {
        // Fallback for employees
        const employees = await base44.entities.Employee.filter({ email: currentUser.email });
        if (employees.length > 0 && employees[0].workshop_id) {
            loadedWorkshop = workshops.find(w => w.id === employees[0].workshop_id);
        }
      }
      setWorkshop(loadedWorkshop);
    } catch (error) {
      // toast.error("Você precisa estar logado"); // Removido toast duplicado se falhar auth
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoEmpresario"));
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

  // Fetch histórico
  const { data: history = [] } = useQuery({
    queryKey: ['entrepreneur-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.EntrepreneurDiagnostic.filter({ user_id: user.id }, '-created_date');
    },
    enabled: !!user?.id
  });

  const startNew = () => {
    setViewMode("new");
    setCurrentQuestion(0);
    setAnswers({});
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
      
      const response = await base44.functions.invoke('submitAppForms', {
        form_type: 'entrepreneur_diagnostic',
        workshop_id: workshop?.id || null,
        answers: answersArray,
        dominant_profile: dominantProfile,
        profile_scores: scores
      });

      if (response.data.error) throw new Error(response.data.error);
      
      toast.success("Diagnóstico concluído!");
      navigate(createPageUrl("ResultadoEmpresario") + `?id=${response.data.id}`);
    } catch (error) {
      console.error("Erro ao salvar diagnóstico:", error);
      toast.error("Erro ao salvar diagnóstico: " + (error.message || "Erro desconhecido"));
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

  if (viewMode === "history") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Diagnóstico do Perfil Empresário</h1>
              <p className="text-gray-600">Descubra e acompanhe seu perfil de gestão</p>
            </div>
            <Button onClick={startNew} className="bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4 mr-2" />
              Novo Diagnóstico
            </Button>
          </div>

          <div className="grid gap-4">
            {history.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <p className="mb-4">Nenhum diagnóstico realizado ainda.</p>
                  <Button onClick={startNew}>Começar Agora</Button>
                </CardContent>
              </Card>
            ) : (
              history.map((diag, idx) => (
                <Card key={diag.id || idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl
                        ${diag.dominant_profile === 'aventureiro' ? 'bg-orange-500' : 
                          diag.dominant_profile === 'empreendedor' ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {diag.dominant_profile?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg capitalize">{diag.dominant_profile}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(diag.created_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate(createPageUrl("ResultadoEmpresario") + `?id=${diag.id}`)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Resultado
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setViewMode("history")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Histórico
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Novo Diagnóstico
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