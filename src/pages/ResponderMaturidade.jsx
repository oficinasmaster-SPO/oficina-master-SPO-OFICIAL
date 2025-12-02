import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, User, CheckCircle2, AlertCircle } from "lucide-react";
import { maturityQuestions, answerMapping } from "../components/maturity/MaturityQuestions";
import { toast } from "sonner";

export default function ResponderMaturidade() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await base44.functions.invoke('validateDiagnosticToken', { token });
      if (response.data.valid) {
        setValidToken(true);
        setInviteData(response.data.invite);
      } else {
        toast.error(response.data.error || "Link inválido");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao validar link");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (letter) => {
    setAnswers({ ...answers, [maturityQuestions[currentQuestion].id]: letter });
  };

  const handleNext = () => {
    if (currentQuestion < maturityQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const scores = { bebe: 0, crianca: 0, adolescente: 0, adulto: 0 };
      
      const answersArray = Object.entries(answers).map(([questionId, letter]) => {
        const maturityLevel = answerMapping[parseInt(questionId)][letter];
        scores[maturityLevel]++;
        return { question_id: parseInt(questionId), selected_option: letter };
      });
      
      const dominantLevel = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

      await base44.functions.invoke('submitDiagnostic', {
        invite_token: token,
        answers: answersArray,
        maturity_level: dominantLevel,
        maturity_scores: scores,
        type: 'MATURITY'
      });

      setSubmitted(true);
      toast.success("Avaliação enviada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentQuestion + 1) / maturityQuestions.length) * 100;
  const question = maturityQuestions[currentQuestion];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Link Inválido ou Expirado</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Obrigado!</h2>
            <p className="text-gray-600">Sua autoavaliação foi registrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Autoavaliação Profissional</h1>
          <p className="text-gray-600">
            Colaborador: <strong>{inviteData?.candidate_name || 'Você'}</strong>
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Questão {currentQuestion + 1} de {maturityQuestions.length}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-lg border-t-4 border-purple-600">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{question.question}</h2>
            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  onClick={() => handleAnswer(option.letter)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[question.id] === option.letter
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      answers[question.id] === option.letter ? "bg-purple-600 text-white" : "bg-gray-200"
                    }`}>
                      {option.letter}
                    </div>
                    <p className="text-gray-700">{option.text}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleNext}
            disabled={!answers[question.id] || submitting}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {submitting ? <Loader2 className="animate-spin" /> : (
              currentQuestion === maturityQuestions.length - 1 ? "Finalizar" : "Próxima"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}