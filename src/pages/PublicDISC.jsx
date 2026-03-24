import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { discQuestions, profileInfo } from "@/components/disc/DISCQuestions";

export default function PublicDISC() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    const fetchSession = async () => {
      try {
        const res = await base44.entities.DISCPublicSession.filter({ token });
        if (res && res.length > 0) {
          setSession(res[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
    
    const initialAnswers = {};
    discQuestions.forEach(q => {
      initialAnswers[q.id] = { d: "", i: "", s: "", c: "" };
    });
    setAnswers(initialAnswers);
  }, [token]);

  const updateAnswer = (questionId, profile, value) => {
    if (value !== "" && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 4)) return;
    const currentAnswers = answers[questionId] || {};
    const usedNumbers = Object.entries(currentAnswers)
      .filter(([key]) => key !== profile)
      .map(([, val]) => val)
      .filter(v => v !== "");

    if (value !== "" && usedNumbers.includes(value)) {
      toast.error(`Número ${value} já foi usado neste conjunto. Escolha outro.`);
      return;
    }

    setAnswers({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        [profile]: value
      }
    });
  };

  const isQuestionComplete = (questionId) => {
    const answer = answers[questionId];
    if (!answer) return false;
    const values = [answer.d, answer.i, answer.s, answer.c];
    const uniqueValues = new Set(values);
    return uniqueValues.size === 4 && values.every(v => ['1', '2', '3', '4'].includes(v));
  };

  const validateAnswers = () => {
    for (let i = 1; i <= discQuestions.length; i++) {
      if (!isQuestionComplete(i)) {
        toast.error(`Conjunto ${i}: Preencha todos os campos com números de 1 a 4`);
        return false;
      }
    }
    return true;
  };

  const getRecommendedRoles = (scores) => {
    const roles = [];
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top1 = sorted[0][0];
    const top2 = sorted[1][0];

    if (top1 === "executor_d" || top2 === "executor_d") {
      if (scores.executor_d > 30) roles.push("Gerente Geral", "Líder de Equipe", "Coordenador de Produção");
    }
    if (top1 === "comunicador_i" || top2 === "comunicador_i") {
      if (scores.comunicador_i > 30) roles.push("Consultor de Vendas", "Atendimento ao Cliente", "Marketing");
    }
    if (top1 === "planejador_s" || top2 === "planejador_s") {
      if (scores.planejador_s > 30) roles.push("Coordenador Administrativo", "Supervisor de Processos");
    }
    if (top1 === "analista_c" || top2 === "analista_c") {
      if (scores.analista_c > 30) roles.push("Analista de Qualidade", "Controlador Financeiro");
    }
    return roles.length > 0 ? roles : ["Função a definir conforme necessidade da oficina"];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAnswers()) return;
    setSubmitting(true);

    try {
      let totalD = 0, totalI = 0, totalS = 0, totalC = 0;
      const answersArray = Object.entries(answers).map(([questionId, scores]) => {
        const d = parseInt(scores.d) || 0;
        const i = parseInt(scores.i) || 0;
        const s = parseInt(scores.s) || 0;
        const c = parseInt(scores.c) || 0;
        totalD += d; totalI += i; totalS += s; totalC += c;
        return { question_id: parseInt(questionId), d_score: d, i_score: i, s_score: s, c_score: c };
      });

      const total = totalD + totalI + totalS + totalC;
      const profileScores = {
        executor_d: (totalD / total) * 100,
        comunicador_i: (totalI / total) * 100,
        planejador_s: (totalS / total) * 100,
        analista_c: (totalC / total) * 100
      };

      const dominant = Object.keys(profileScores).reduce((a, b) => profileScores[a] > profileScores[b] ? a : b);
      const recommendedRoles = getRecommendedRoles(profileScores);

      const discEntry = await base44.entities.DISCDiagnostic.create({
        workshop_id: session.workshop_id,
        employee_id: session.employee_id,
        candidate_id: session.candidate_id || null,
        candidate_name: session.candidate_name,
        evaluation_type: 'self',
        answers: answersArray,
        profile_scores: profileScores,
        dominant_profile: dominant,
        recommended_roles: recommendedRoles,
        completed: true,
        invite_id: session.id
      });

      if (session.candidate_id) {
        try {
          const profileMap = {
            'executor_d': 'Executor (D)',
            'comunicador_i': 'Comunicador (I)',
            'planejador_s': 'Planejador (S)',
            'analista_c': 'Analista (C)'
          };
          await base44.entities.Candidate.update(session.candidate_id, {
            disc_status: 'concluido',
            disc_result_id: discEntry.id,
            disc_profile: profileMap[dominant] || dominant
          });
        } catch (e) {
          console.error("Erro ao atualizar candidato:", e);
        }
      }

      await base44.entities.DISCPublicSession.update(session.id, {
        status: 'completed',
        result_id: discEntry.id
      });

      setSession({ ...session, status: 'completed' });
      toast.success("Teste concluído com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-gray-600">
            Link inválido ou não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center py-8">
          <CardContent>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliação Concluída</h2>
            <p className="text-gray-600">Este teste já foi respondido. Obrigado!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filledCount = Object.keys(answers).filter(key => isQuestionComplete(parseInt(key))).length;
  const progress = (filledCount / discQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Teste Comportamental DISC</h1>
          <p className="text-gray-600 mt-2">
            Olá, {session.candidate_name || "Colaborador"}! Responda ao teste abaixo com sinceridade.
          </p>
        </div>

        <Card className="bg-amber-50 border-2 border-amber-300 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>⚠️ IMPORTANTE:</strong> Em cada conjunto, use os números de <strong>1 a 4 apenas UMA VEZ cada</strong>:
                <br />• <strong>4</strong> = Característica que MAIS se identifica com você
                <br />• <strong>3</strong> = Segunda característica
                <br />• <strong>2</strong> = Terceira característica
                <br />• <strong>1</strong> = Característica que MENOS se identifica
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 mb-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso: {filledCount}/{discQuestions.length} conjuntos</span>
            <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {discQuestions.map((question) => {
            const isComplete = isQuestionComplete(question.id);
            return (
              <Card key={question.id} className={`border-2 ${isComplete ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                <CardHeader className={`${isComplete ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Conjunto {question.id}</CardTitle>
                    {isComplete && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-semibold">Completo</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { key: 'd', text: question.traits.d, label: 'Opção A', color: 'red' },
                      { key: 'i', text: question.traits.i, label: 'Opção B', color: 'yellow' },
                      { key: 's', text: question.traits.s, label: 'Opção C', color: 'green' },
                      { key: 'c', text: question.traits.c, label: 'Opção D', color: 'blue' }
                    ].map((trait, index) => {
                      const bgColors = { red: 'bg-red-100', yellow: 'bg-yellow-100', green: 'bg-green-100', blue: 'bg-blue-100' };
                      const badgeColors = { red: 'bg-red-500', yellow: 'bg-yellow-500', green: 'bg-green-500', blue: 'bg-blue-500' };
                      return (
                        <div key={index} className={`${bgColors[trait.color]} rounded-lg p-4 border-2 border-gray-300`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 ${badgeColors[trait.color]} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{trait.label}</span>
                          </div>
                          <p className="text-xs text-gray-700 mb-3 min-h-[48px] leading-tight">{trait.text}</p>
                          <Input
                            type="number" min="1" max="4" placeholder="1-4"
                            value={answers[question.id]?.[trait.key] || ""}
                            onChange={(e) => updateAnswer(question.id, trait.key, e.target.value)}
                            className="text-center text-xl font-bold h-12"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          <div className="flex justify-center pt-6">
            <Button type="submit" disabled={submitting || filledCount < discQuestions.length} className="bg-indigo-600 hover:bg-indigo-700 text-lg px-12 py-6 rounded-full shadow-lg">
              {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</> : <><Brain className="w-5 h-5 mr-2" /> Finalizar Teste DISC</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}