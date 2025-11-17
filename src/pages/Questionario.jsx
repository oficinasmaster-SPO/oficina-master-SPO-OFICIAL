
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { questions } from "../components/diagnostic/Questions";
import { toast } from "sonner";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";

export default function Questionario() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingWorkshop, setLoadingWorkshop] = useState(true);
  const [workshop, setWorkshop] = useState(null);

  useEffect(() => {
    checkWorkshop();
  }, []);

  const checkWorkshop = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      
      if (!userWorkshop) {
        toast.error("Você precisa cadastrar sua oficina antes de iniciar o diagnóstico");
        navigate(createPageUrl("Cadastro"));
        return;
      }
      
      setWorkshop(userWorkshop);
    } catch (error) {
      toast.error("Você precisa estar logado para responder o questionário");
      base44.auth.redirectToLogin(createPageUrl("Questionario"));
    } finally {
      setLoadingWorkshop(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];

  const handleAnswer = (letter) => {
    setAnswers({ ...answers, [question.id]: letter });
  };

  const handleNext = () => {
    if (!answers[question.id]) {
      toast.error("Por favor, selecione uma resposta");
      return;
    }
    
    if (currentQuestion < questions.length - 1) {
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
      const user = await base44.auth.me();
      
      const letterCounts = { A: 0, B: 0, C: 0, D: 0 };
      Object.values(answers).forEach(letter => {
        letterCounts[letter]++;
      });
      
      const dominantLetter = Object.keys(letterCounts).reduce((a, b) => 
        letterCounts[a] > letterCounts[b] ? a : b
      );
      
      const phaseMap = { D: 1, A: 2, C: 3, B: 4 };
      const phase = phaseMap[dominantLetter];
      
      const answersArray = Object.entries(answers).map(([id, letter]) => ({
        question_id: parseInt(id),
        selected_option: letter
      }));
      
      const diagnostic = await base44.entities.Diagnostic.create({
        user_id: user.id,
        workshop_id: workshop.id,
        answers: answersArray,
        phase: phase,
        dominant_letter: dominantLetter,
        completed: true
      });
      
      toast.success("Diagnóstico concluído com sucesso!");
      navigate(createPageUrl("Resultado") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingWorkshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <DynamicHelpSystem pageName="Questionario" autoStartTour={currentQuestion === 0} />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Diagnóstico da Oficina
              </h1>
              {workshop && (
                <p className="text-sm text-gray-600 mt-1">
                  {workshop.name}
                </p>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Pergunta {currentQuestion + 1} de {questions.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-xl border-2">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                {question.question}
              </h2>
            </div>

            <div className="space-y-4">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  onClick={() => handleAnswer(option.letter)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    answers[question.id] === option.letter
                      ? "border-blue-600 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      answers[question.id] === option.letter
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {option.letter}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 leading-relaxed">
                        {option.text}
                      </p>
                    </div>
                    {answers[question.id] === option.letter && (
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
            {currentQuestion === questions.length - 1 ? (
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
