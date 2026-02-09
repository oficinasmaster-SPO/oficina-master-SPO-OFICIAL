import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, DollarSign, Sparkles } from "lucide-react";
import { assessmentCriteria } from "../../components/assessment/AssessmentCriteria";
import { toast } from "sonner";
import AudioTranscriber from "../../components/assessment/AudioTranscriber";
import { Textarea } from "@/components/ui/textarea";

export default function AutoavaliacaoFinanceiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [scores, setScores] = useState({});
  const [answers, setAnswers] = useState({});
  const [userFeedback, setUserFeedback] = useState("");

  const criteria = assessmentCriteria.financeiro;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);

      const initialScores = {};
      const initialAnswers = {};
      criteria.criteria.forEach(c => {
        initialScores[c.key] = 5;
        initialAnswers[c.key] = { score: 5, situacao: "", justificativa: "", audio_url: null };
      });
      setScores(initialScores);
      setAnswers(initialAnswers);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("AutoavaliacaoFinanceiro"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const incompleteQuestions = criteria.criteria.filter(c => {
      const answer = answers[c.key];
      return !answer?.situacao?.trim() || !answer?.justificativa?.trim();
    });

    if (incompleteQuestions.length > 0) {
      toast.error(`Complete todas as perguntas: ${incompleteQuestions.map(q => q.label).join(", ")}`);
      return;
    }

    setSubmitting(true);

    try {
      const average = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
      
      const weakPoints = Object.entries(scores)
        .filter(([_, score]) => score < 6)
        .map(([key, _]) => criteria.criteria.find(c => c.key === key)?.label)
        .filter(Boolean);

      const strongPoints = Object.entries(scores)
        .filter(([_, score]) => score >= 8)
        .map(([key, _]) => criteria.criteria.find(c => c.key === key)?.label)
        .filter(Boolean);

      const aiPrompt = `
Analise a autoavaliação Financeira de uma oficina automotiva com as seguintes notas (0-10):
${Object.entries(scores).map(([key, score]) => {
  const crit = criteria.criteria.find(c => c.key === key);
  return `${crit?.label || key}: ${score}/10`;
}).join('\n')}

Média geral: ${average.toFixed(1)}/10

Gere um relatório profissional incluindo:
1. Diagnóstico geral da área financeira
2. Pontos fortes a manter
3. Gargalos críticos a resolver
4. Recomendações práticas baseadas na metodologia Oficinas Master
5. Plano 5W2H para os 4 problemas mais críticos
6. Estratégias de fluxo de caixa e gestão financeira

Feedback adicional do usuário para consideração: """${userFeedback}"""
`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt
      });

      if (!aiResponse) {
        throw new Error("Falha ao gerar análise com IA");
      }

      const formattedAnswers = criteria.criteria.map(c => ({
        question_key: c.key,
        question_label: c.label,
        score: scores[c.key],
        situacao: answers[c.key].situacao,
        justificativa: answers[c.key].justificativa,
        audio_url: answers[c.key].audio_url
      }));

      const assessment = await base44.entities.ProcessAssessment.create({
        workshop_id: workshop?.id || null,
        evaluator_id: user?.id || null,
        assessment_type: "financeiro",
        answers: formattedAnswers,
        scores: scores,
        average_score: average,
        strengths: strongPoints,
        weaknesses: weakPoint,
        bottlenecks: weakPoints,
        ai_recommendations: typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse),
        user_feedback: userFeedback || "",
        completed: true
      });

      if (!assessment?.id) {
        throw new Error("Falha ao criar avaliação");
      }

      toast.success("Avaliação concluída com sucesso!");
      navigate(createPageUrl("ResultadoAutoavaliacao") + `?id=${assessment.id}`);
    } catch (error) {
      console.error("Erro ao processar avaliação:", error);
      toast.error("Erro ao processar avaliação: " + (error.message || "Tente novamente"));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Autoavaliação - Processos Financeiros
          </h1>
          <p className="text-lg text-gray-600">
            Avalie de 0 a 10 cada processo e receba diagnóstico com IA
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {criteria.criteria.map((criterion) => (
            <Card key={criterion.key}>
              <CardHeader>
                <CardTitle className="text-lg">{criterion.label}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {criterion.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Nota: {scores[criterion.key]}/10</Label>
                    <div className={`text-2xl font-bold ${
                      scores[criterion.key] >= 8 ? 'text-green-600' :
                      scores[criterion.key] >= 6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {scores[criterion.key]}
                    </div>
                  </div>
                  <Slider
                    value={[scores[criterion.key]]}
                    onValueChange={(value) => {
                      setScores({...scores, [criterion.key]: value[0]});
                      setAnswers({...answers, [criterion.key]: {...answers[criterion.key], score: value[0]}});
                    }}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 - Inexistente</span>
                    <span>5 - Médio</span>
                    <span>10 - Excelente</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label className="flex items-center gap-1">
                      Situação Atual <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Descreva qual é a situação real que acontece hoje..."
                      value={answers[criterion.key]?.situacao || ""}
                      onChange={(e) => setAnswers({...answers, [criterion.key]: {...answers[criterion.key], situacao: e.target.value}})}
                      className="min-h-[80px]"
                      required
                    />
                    <AudioTranscriber
                      placeholder="Gravar situação"
                      onTranscriptionComplete={(text) => setAnswers({...answers, [criterion.key]: {...answers[criterion.key], situacao: text}})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Justificativa <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Por que você deu essa nota? O que precisa melhorar?"
                      value={answers[criterion.key]?.justificativa || ""}
                      onChange={(e) => setAnswers({...answers, [criterion.key]: {...answers[criterion.key], justificativa: e.target.value}})}
                      className="min-h-[80px]"
                      required
                    />
                    <AudioTranscriber
                      placeholder="Gravar justificativa"
                      onTranscriptionComplete={(text) => setAnswers({...answers, [criterion.key]: {...answers[criterion.key], justificativa: text}})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback Adicional</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Use este campo para adicionar informações que você considera relevantes para a IA analisar e personalizar ainda mais o seu diagnóstico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                placeholder="Ex: Dificuldades com fluxo de caixa, endividamento, controle de custos..."
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-lg px-12 py-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando Diagnóstico com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Diagnóstico Completo
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
