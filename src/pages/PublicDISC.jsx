import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Brain, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { discQuestions, profileInfo } from "@/components/disc/DISCQuestions";

export default function PublicDISC() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [session, setSession] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1 = Info, 2 = Teste, 3 = Resultado
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });
  
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        const sessions = await base44.entities.DISCPublicSession.filter({ token });
        if (sessions.length > 0) {
          const currentSession = sessions[0];
          setSession(currentSession);
          
          if (currentSession.candidate_name) {
            setFormData(prev => ({...prev, name: currentSession.candidate_name}));
          }

          if (currentSession.status === "concluido") {
            setStep(3); // Mostra que já foi feito
          } else {
             // Iniciar respostas vazias
             const initialAnswers = {};
             discQuestions.forEach(q => {
               initialAnswers[q.id] = { d: "", i: "", s: "", c: "" };
             });
             setAnswers(initialAnswers);
          }

          const workshopData = await base44.entities.Workshop.get(currentSession.workshop_id);
          setWorkshop(workshopData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [token]);

  const updateAnswer = (questionId, profile, value) => {
    if (value !== "" && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 4)) return;

    const currentAnswers = answers[questionId] || {};
    const usedNumbers = Object.entries(currentAnswers)
      .filter(([key]) => key !== profile)
      .map(([, val]) => val)
      .filter(v => v !== "");

    if (value !== "" && usedNumbers.includes(value)) {
      alert(`Número ${value} já foi usado neste conjunto. Escolha outro.`);
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

  const getFilledQuestions = () => {
    return Object.keys(answers).filter(key => isQuestionComplete(parseInt(key))).length;
  };

  const handleSubmitInfo = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmitTest = async () => {
    if (getFilledQuestions() < discQuestions.length) {
      alert("Preencha todas as questões corretamente antes de enviar.");
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

      // Create diagnostic via API/Function or direct insert
      const diagData = {
        workshop_id: session.workshop_id,
        candidate_name: formData.name,
        evaluation_type: 'self',
        answers: answersArray,
        profile_scores: profileScores,
        dominant_profile: dominant,
        completed: true,
        invite_id: session.id
      };
      
      if (session.employee_id) diagData.employee_id = session.employee_id;
      else diagData.candidate_id = "external_candidate";

      const diag = await base44.entities.DISCDiagnostic.create(diagData);

      // Update session
      await base44.entities.DISCPublicSession.update(session.id, {
        status: "concluido",
        completed_at: new Date().toISOString(),
        candidate_name: formData.name,
        candidate_phone: formData.phone,
        candidate_email: formData.email,
        result_id: diag.id
      });

      setResult({ profileScores, dominant });
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar o teste. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  if (!session || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <CardTitle>Link Inválido</CardTitle>
          <CardDescription className="mt-2">Este link de teste DISC não é válido ou expirou.</CardDescription>
        </Card>
      </div>
    );
  }

  if (session.status === "concluido" && !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-10 shadow-lg border-t-4 border-t-indigo-500">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-6 text-green-500" />
          <CardTitle className="text-2xl mb-2">Teste já realizado!</CardTitle>
          <CardDescription className="text-base px-6">Você já completou este teste DISC. Agradecemos sua participação.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          {workshop.logo_url ? (
            <img src={workshop.logo_url} alt="Logo" className="h-16 mx-auto mb-4 object-contain rounded" />
          ) : (
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-indigo-600" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Mapeamento de Perfil Comportamental</h1>
          <p className="text-gray-600 mt-2">{workshop.name}</p>
        </div>

        {step === 1 && (
          <Card className="max-w-md mx-auto shadow-lg border-2 border-indigo-100">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
              <CardTitle>Identificação</CardTitle>
              <CardDescription>Confirme seus dados para iniciar o teste</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmitInfo} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4">
                  Iniciar Teste <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-4 z-10">
              <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Progresso: {getFilledQuestions()} de {discQuestions.length}</span>
                <span>{((getFilledQuestions() / discQuestions.length) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(getFilledQuestions() / discQuestions.length) * 100} className="h-3" />
              
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-900">
                <strong>Regra Importante:</strong> Em cada conjunto, dê notas de <strong>1 a 4</strong> para as alternativas. 
                Use cada número apenas UMA vez por conjunto (4 = Mais parece com você, 1 = Menos parece).
              </div>
            </div>

            <div className="space-y-6">
              {discQuestions.map((q, idx) => {
                 const isComplete = isQuestionComplete(q.id);
                 return (
                   <Card key={q.id} className={`border-2 transition-colors ${isComplete ? 'border-green-300' : 'border-slate-200 hover:border-indigo-300'}`}>
                     <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                       <CardTitle className="text-base flex justify-between">
                         <span>{idx + 1}. {q.question}</span>
                         {isComplete && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="pt-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                         {[
                           { key: 'd', traits: q.traits.d },
                           { key: 'i', traits: q.traits.i },
                           { key: 's', traits: q.traits.s },
                           { key: 'c', traits: q.traits.c }
                         ].map((opt, i) => (
                           <div key={opt.key} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <div className="font-semibold text-slate-700 text-sm mb-2">Opção {String.fromCharCode(65 + i)}</div>
                             <p className="text-xs text-slate-600 mb-3 min-h-[40px]">{opt.traits}</p>
                             <Input
                               type="number"
                               min="1" max="4"
                               placeholder="1-4"
                               className="text-center font-bold"
                               value={answers[q.id]?.[opt.key] || ""}
                               onChange={(e) => updateAnswer(q.id, opt.key, e.target.value)}
                             />
                           </div>
                         ))}
                       </div>
                     </CardContent>
                   </Card>
                 )
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
              <Button 
                onClick={handleSubmitTest} 
                disabled={submitting || getFilledQuestions() < discQuestions.length}
                className="bg-indigo-600 hover:bg-indigo-700 px-8"
              >
                {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Finalizar Teste"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="animate-in zoom-in-95 duration-500">
            <Card className="max-w-2xl mx-auto overflow-hidden shadow-2xl border-0">
              <div className="bg-indigo-600 p-10 text-center text-white">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-300" />
                <h2 className="text-3xl font-bold mb-2">Teste Concluído!</h2>
                <p className="text-indigo-100">Obrigado pela sua participação, {formData.name}.</p>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-lg text-slate-500 font-medium uppercase tracking-wider mb-2">Seu Perfil Predominante é</h3>
                  <div className="text-4xl font-black text-indigo-900 inline-block px-6 py-2 bg-indigo-50 rounded-xl border-2 border-indigo-100">
                    {profileInfo[result.dominant].title}
                  </div>
                  <p className="mt-4 text-slate-600 text-sm leading-relaxed max-w-lg mx-auto">
                    {profileInfo[result.dominant].description}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700">Distribuição do seu Perfil:</h4>
                  {Object.entries(result.profileScores)
                    .sort((a,b) => b[1] - a[1])
                    .map(([key, score]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{profileInfo[key].title}</span>
                        <span className="font-bold">{score.toFixed(1)}%</span>
                      </div>
                      <Progress value={score} className="h-2" style={{
                         '--progress-background': profileInfo[key].color
                      }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}