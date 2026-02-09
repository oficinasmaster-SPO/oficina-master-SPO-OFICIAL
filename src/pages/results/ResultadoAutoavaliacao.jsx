import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, Printer, Share2, Database } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { assessmentCriteria } from "../../components/assessment/AssessmentCriteria";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoAutoavaliacao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [savingToIntelligence, setSavingToIntelligence] = useState(false);

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', assessment?.id],
    queryFn: async () => {
      if (!assessment?.id) return null;
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: assessment.id,
        diagnostic_type: 'ProcessAssessment'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!assessment?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!assessment?.id) throw new Error('Assessment não encontrado');
      return await base44.functions.invoke('generateActionPlanProcess', { diagnostic_id: assessment.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', assessment?.id]);
      toast.success('Plano gerado!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar plano: ' + error.message);
    }
  });

  const refinePlanMutation = useMutation({
    mutationFn: async ({ feedback }) => {
      if (!actionPlan?.id) throw new Error('Plano não encontrado');
      return await base44.functions.invoke('refineActionPlan', {
        plan_id: actionPlan.id,
        feedback_content: feedback.content,
        feedback_type: feedback.type,
        audio_url: feedback.audio_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', assessment?.id]);
      setShowFeedbackModal(false);
      toast.success('Plano refinado!');
    },
    onError: (error) => {
      toast.error('Erro ao refinar plano: ' + error.message);
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityIndex, status }) => {
      if (!actionPlan?.id || !actionPlan?.plan_data?.implementation_schedule) {
        throw new Error('Dados do plano inválidos');
      }
      const updatedSchedule = [...actionPlan.plan_data.implementation_schedule];
      updatedSchedule[activityIndex].status = status;
      if (status === 'concluida') updatedSchedule[activityIndex].completed_date = new Date().toISOString();
      const completion = Math.round((updatedSchedule.filter(a => a.status === 'concluida').length / updatedSchedule.length) * 100);
      return await base44.entities.DiagnosticActionPlan.update(actionPlan.id, {
        plan_data: { ...actionPlan.plan_data, implementation_schedule: updatedSchedule },
        completion_percentage: completion
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', assessment?.id]);
      toast.success('Atividade atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const assessmentId = urlParams.get("id");

      if (!assessmentId) {
        toast.error("Avaliação não encontrada");
        navigate(createPageUrl("Autoavaliacoes"));
        return;
      }

      const assessments = await base44.entities.ProcessAssessment.list();
      const current = assessments.find(a => a.id === assessmentId);

      if (!current) {
        toast.error("Avaliação não encontrada");
        navigate(createPageUrl("Autoavaliacoes"));
        return;
      }

      setAssessment(current);
    } catch (error) {
      console.error("Erro ao carregar resultado:", error);
      toast.error("Erro ao carregar resultado: " + (error.message || "Tente novamente"));
      navigate(createPageUrl("Autoavaliacoes"));
    } finally {
      setLoading(false);
    }
  };

  const saveToClientIntelligence = async () => {
    if (!assessment?.answers || !assessment?.workshop_id) {
      toast.error("Dados incompletos para salvar");
      return;
    }

    setSavingToIntelligence(true);
    try {
      const areaMap = {
        vendas: 'vendas_conversao',
        comercial: 'vendas_conversao',
        marketing: 'marketing_demanda',
        pessoas: 'pessoas_contratacao',
        financeiro: 'financeiro',
        empresarial: 'gestao_processos',
        ma3: 'gestao_processos'
      };

      const records = assessment.answers
        .filter(a => a.situacao?.trim() || a.justificativa?.trim())
        .map(answer => ({
          workshop_id: assessment.workshop_id,
          area: areaMap[assessment.assessment_type] || 'gestao_processos',
          type: answer.score < 5 ? 'dor' : answer.score < 7 ? 'duvida' : 'evolucao',
          subcategory: answer.question_key,
          title: `${answer.question_label} (Nota: ${answer.score})`,
          description: `**Situação:** ${answer.situacao || 'Não informado'}\n\n**Justificativa:** ${answer.justificativa || 'Não informado'}${answer.audio_url ? `\n\n**Áudio:** ${answer.audio_url}` : ''}`,
          gravity: answer.score < 4 ? 'critica' : answer.score < 6 ? 'alta' : answer.score < 8 ? 'media' : 'baixa',
          tags: [
            'autoavaliacao',
            assessment.assessment_type,
            `ProcessAssessment:${assessment.id}`,
            `score_${answer.score}`
          ],
          status: 'ativo'
        }));

      if (records.length > 0) {
        await Promise.all(records.map(record => base44.entities.ClientIntelligence.create(record)));
        toast.success(`${records.length} situações salvas na Inteligência do Cliente`);
        navigate(createPageUrl("IntelligenciaCliente") + "?source=autoavaliacao");
      } else {
        toast.info("Nenhuma situação detalhada para salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar na Inteligência: " + error.message);
    } finally {
      setSavingToIntelligence(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!assessment) return null;

  const criteriaConfig = assessmentCriteria[assessment.assessment_type];
  
  const radarData = Object.entries(assessment.scores).map(([key, value]) => {
    const criterion = criteriaConfig.criteria.find(c => c.key === key);
    return {
      criterion: criterion?.label || key,
      score: value
    };
  });

  const getContextualFeedback = () => {
    if (!assessment?.answers || assessment.answers.length === 0) {
      return assessment.ai_recommendations;
    }

    const groupedByScore = {
      criticos: assessment.answers.filter(a => a.score < 5),
      atencao: assessment.answers.filter(a => a.score >= 5 && a.score < 7),
      bons: assessment.answers.filter(a => a.score >= 7)
    };

    let contextualText = `## Análise Detalhada - ${criteriaConfig.title}\n\n`;
    contextualText += `**Média Geral:** ${assessment.average_score.toFixed(1)}/10\n\n`;

    if (groupedByScore.criticos.length > 0) {
      contextualText += `### 🔴 Pontos Críticos (Score < 5)\n\n`;
      groupedByScore.criticos.forEach(a => {
        contextualText += `**${a.question_label}** - Nota: ${a.score}/10\n`;
        if (a.situacao) contextualText += `- *Situação:* ${a.situacao}\n`;
        if (a.justificativa) contextualText += `- *Justificativa:* ${a.justificativa}\n`;
        contextualText += '\n';
      });
    }

    if (groupedByScore.atencao.length > 0) {
      contextualText += `### 🟡 Pontos de Atenção (Score 5-6)\n\n`;
      groupedByScore.atencao.forEach(a => {
        contextualText += `**${a.question_label}** - Nota: ${a.score}/10\n`;
        if (a.situacao) contextualText += `- *Situação:* ${a.situacao}\n`;
        if (a.justificativa) contextualText += `- *Justificativa:* ${a.justificativa}\n`;
        contextualText += '\n';
      });
    }

    if (groupedByScore.bons.length > 0) {
      contextualText += `### 🟢 Pontos Fortes (Score ≥ 7)\n\n`;
      groupedByScore.bons.forEach(a => {
        contextualText += `**${a.question_label}** - Nota: ${a.score}/10\n`;
        if (a.situacao) contextualText += `- *Situação:* ${a.situacao}\n`;
        contextualText += '\n';
      });
    }

    contextualText += `\n---\n\n${assessment.ai_recommendations}`;
    return contextualText;
  };

  const healthStatus = assessment.average_score >= 8 ? "excelente" :
                      assessment.average_score >= 6 ? "bom" :
                      assessment.average_score >= 4 ? "atencao" : "critico";

  const healthConfig = {
    excelente: { color: "from-green-500 to-emerald-600", icon: CheckCircle2, text: "Excelente" },
    bom: { color: "from-blue-500 to-blue-600", icon: CheckCircle2, text: "Bom" },
    atencao: { color: "from-yellow-500 to-amber-600", icon: AlertTriangle, text: "Atenção" },
    critico: { color: "from-red-500 to-red-600", icon: AlertTriangle, text: "Crítico" }
  };

  const config = healthConfig[healthStatus];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado - {criteriaConfig.title}
          </h1>
          <p className="text-xl text-gray-600">Análise completa com recomendações IA</p>
        </div>

        {/* Status Geral */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${config.color}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Status: {config.text}</h2>
                <p className="text-white/90 text-lg">Média Geral: {assessment.average_score.toFixed(1)}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Roda Empresarial</CardTitle>
              <CardDescription>Visualização dos processos avaliados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} />
                  <Radar name="Nota" dataKey="score" stroke={criteriaConfig.color} fill={criteriaConfig.color} fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pontos Fortes e Fracos */}
          <div className="space-y-4">
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle2 className="w-5 h-5" />
                  Pontos Fortes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assessment.strengths?.length > 0 ? (
                  <ul className="space-y-2">
                    {assessment.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">Nenhum ponto forte destacado</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-5 h-5" />
                  Gargalos Críticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assessment.weaknesses?.length > 0 ? (
                  <ul className="space-y-2">
                    {assessment.weaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">!</span>
                        <span className="text-gray-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">Nenhum gargalo identificado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Análise IA com Feedback Contextual */}
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Análise Detalhada & Recomendações IA
            </CardTitle>
            <CardDescription>Diagnóstico profissional com base nas suas respostas</CardDescription>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <ReactMarkdown>{getContextualFeedback()}</ReactMarkdown>
          </CardContent>
        </Card>

        {/* Plano Personalizado com IA */}
        {showActionPlanDetails && actionPlan ? (
          <div className="mb-6">
            <ActionPlanDetails
              plan={actionPlan}
              onUpdateActivity={(index, status) => updateActivityMutation.mutate({ activityIndex: index, status })}
              onBack={() => setShowActionPlanDetails(false)}
            />
          </div>
        ) : actionPlan ? (
          <div className="mb-6">
            <ActionPlanCard
              plan={actionPlan}
              onViewDetails={() => setShowActionPlanDetails(true)}
              onRefine={() => setShowFeedbackModal(true)}
            />
          </div>
        ) : (
          <Card className="mb-6 border-2 border-dashed border-purple-300 bg-purple-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Melhoria de Processos com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano detalhado para otimizar seus processos de {criteriaConfig.title.toLowerCase()}.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {generatePlanMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" />Gerar Plano com IA</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <ActionPlanFeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(feedback) => refinePlanMutation.mutate({ feedback })}
          isLoading={refinePlanMutation.isPending}
        />

        {/* Salvar na Inteligência do Cliente */}
        {assessment?.answers?.length > 0 && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    💡 Salvar na Inteligência do Cliente
                  </h3>
                  <p className="text-sm text-gray-600">
                    Registre suas situações detalhadas para acompanhamento contínuo e análise de evolução
                  </p>
                </div>
                <Button
                  onClick={saveToClientIntelligence}
                  disabled={savingToIntelligence}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {savingToIntelligence ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><Database className="w-4 h-4 mr-2" />Ir para Inteligência</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button onClick={() => navigate(createPageUrl("AutoavaliacaoVendas"))} className="bg-green-600 hover:bg-green-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            Nova Avaliação
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copiado!");
          }}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>
    </div>
  );
}
