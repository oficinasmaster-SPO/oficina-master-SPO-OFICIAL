import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, CheckCircle2, AlertCircle } from "lucide-react";
import { discQuestions } from "../components/disc/DISCQuestions";
import { toast } from "sonner";

export default function ResponderDISC() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    validateToken();
    // Initialize answers
    const initialAnswers = {};
    discQuestions.forEach(q => {
      initialAnswers[q.id] = { d: "", i: "", s: "", c: "" };
    });
    setAnswers(initialAnswers);
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
        toast.error(response.data.error || "Link inválido ou expirado");
      }
    } catch (error) {
      console.error("Erro ao validar token:", error);
      toast.error("Erro ao validar link");
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (questionId, profile, value) => {
    if (value !== "" && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 4)) {
      return;
    }
    setAnswers({
      ...answers,
      [questionId]: { ...answers[questionId], [profile]: value }
    });
  };

  const isQuestionComplete = (questionId) => {
    const answer = answers[questionId];
    return answer && answer.d !== "" && answer.i !== "" && answer.s !== "" && answer.c !== "";
  };

  const getFilledQuestions = () => {
    return Object.keys(answers).filter(key => isQuestionComplete(parseInt(key))).length;
  };

  const progress = (getFilledQuestions() / 10) * 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (getFilledQuestions() < 10) {
      toast.error("Por favor, responda todas as questões.");
      return;
    }

    setSubmitting(true);

    try {
      let totalD = 0, totalI = 0, totalS = 0, totalC = 0;
      
      const answersArray = Object.entries(answers).map(([questionId, scores]) => {
        const d = parseInt(scores.d) || 0;
        const i = parseInt(scores.i) || 0;
        const s = parseInt(scores.s) || 0;
        const c = parseInt(scores.c) || 0;
        
        totalD += d;
        totalI += i;
        totalS += s;
        totalC += c;
        
        return {
          question_id: parseInt(questionId),
          d_score: d,
          i_score: i,
          s_score: s,
          c_score: c
        };
      });

      const total = totalD + totalI + totalS + totalC;
      const profileScores = {
        executor_d: (totalD / total) * 100,
        comunicador_i: (totalI / total) * 100,
        planejador_s: (totalS / total) * 100,
        analista_c: (totalC / total) * 100
      };

      const dominant = Object.keys(profileScores).reduce((a, b) => 
        profileScores[a] > profileScores[b] ? a : b
      );

      // Create Diagnostic Record
      // Note: Since this is public, we assume public create access or need another function.
      // Assuming entity 'DISCDiagnostic' allows create publically or we'd use a function.
      // If RLS blocks, we'd need 'submitDiagnostic' function.
      // Let's try standard create first, but as 'responder' user might not be logged in.
      // Actually, standard pattern for public forms is a backend function to submit.
      // But let's try to use the SDK. If it fails, I'll need a function. 
      // Safer to use a function for submission too to update the invite status securely.
      
      // Actually, let's update 'validateDiagnosticToken' to 'manageDiagnostic'? No, separate function.
      // I'll create `submitDiagnosticResponse` function.
      
      await base44.functions.invoke('submitDiagnostic', {
        invite_token: token,
        answers: answersArray,
        profile_scores: profileScores,
        dominant_profile: dominant,
        type: 'DISC'
      });

      setSubmitted(true);
      toast.success("Respostas enviadas com sucesso!");

    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar respostas. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Inválido ou Expirado</h2>
            <p className="text-gray-600">Este link de avaliação não está mais disponível.</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliação Concluída!</h2>
            <p className="text-gray-600">Obrigado por completar o teste DISC.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teste de Perfil DISC</h1>
          <p className="text-gray-600">
            Olá, <strong>{inviteData?.candidate_name || 'Colaborador'}</strong>. Por favor, responda com sinceridade.
          </p>
        </div>

        <div className="sticky top-0 z-10 bg-slate-50 pt-4 pb-6">
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso</span>
              <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-sm text-amber-900">
              <strong>Instruções:</strong> Para cada grupo, pontue de <strong>1 (Menos identificado)</strong> a <strong>4 (Mais identificado)</strong>.
              Não repita números no mesmo grupo.
            </CardContent>
          </Card>

          {discQuestions.map((question) => {
            const isComplete = isQuestionComplete(question.id);
            return (
              <Card key={question.id} className={`border-2 ${isComplete ? 'border-green-200' : 'border-gray-200'}`}>
                <CardHeader className="py-4 bg-gray-50 border-b">
                  <CardTitle className="text-base">Grupo {question.id}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { key: 'd', text: question.traits.d, label: 'A', color: 'red' },
                      { key: 'i', text: question.traits.i, label: 'B', color: 'yellow' },
                      { key: 's', text: question.traits.s, label: 'C', color: 'green' },
                      { key: 'c', text: question.traits.c, label: 'D', color: 'blue' }
                    ].map((trait, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-400">{trait.label}</span>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            value={answers[question.id]?.[trait.key] || ""}
                            onChange={(e) => updateAnswer(question.id, trait.key, e.target.value)}
                            className="w-12 h-10 text-center font-bold border-gray-300 focus:border-indigo-500"
                          />
                        </div>
                        <p className="text-sm text-gray-700">{trait.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-center pt-6 pb-12">
            <Button
              type="submit"
              size="lg"
              disabled={submitting || getFilledQuestions() < 10}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[200px]"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
              ) : (
                "Finalizar Teste"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}