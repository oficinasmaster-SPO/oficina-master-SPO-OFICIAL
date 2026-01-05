import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Search, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import InterviewForm from "@/components/cespe/InterviewForm";
import LeadScoreInterviewForm from "@/components/cespe/LeadScoreInterviewForm";
import ScoreCalculator from "@/components/cespe/ScoreCalculator";
import DreamScriptModal from "@/components/cespe/DreamScriptModal";
import InterviewFormsManager from "@/components/cespe/InterviewFormsManager";

export default function CESPEEntrevista() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const candidateId = urlParams.get('candidate_id');

  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [interviewerNotes, setInterviewerNotes] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [showDreamScript, setShowDreamScript] = useState(false);
  const [showPPE, setShowPPE] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [leadScores, setLeadScores] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops && workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();
  }, []);

  const { data: candidate } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => base44.entities.Candidate.get(candidateId),
    enabled: !!candidateId
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['interview-questions', workshop?.id, selectedForm?.id],
    queryFn: async () => {
      if (selectedForm?.is_lead_score_form) {
        return selectedForm.scoring_criteria || [];
      }
      if (selectedForm?.id) {
        return selectedForm.questions || [];
      }
      if (!workshop?.id) return [];
      const all = await base44.entities.InterviewQuestion.filter({ active: true });
      return all.filter(q => !q.workshop_id || q.workshop_id === workshop.id);
    },
    enabled: !!workshop?.id
  });

  const { data: cultureScript } = useQuery({
    queryKey: ['culture-script', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return null;
      const scripts = await base44.entities.CultureScript.filter({
        workshop_id: workshop.id,
        is_active: true
      });
      return Array.isArray(scripts) && scripts.length > 0 ? scripts[0] : null;
    },
    enabled: !!workshop?.id
  });

  const saveInterviewMutation = useMutation({
    mutationFn: async (data) => {
      let scores;
      let finalAnswers;

      if (selectedForm?.is_lead_score_form) {
        // Calcular scores do Lead Score
        const totalScore = Object.values(leadScores).reduce((sum, v) => sum + v, 0);
        const technicalScore = Object.entries(leadScores)
          .filter(([k]) => k.startsWith('tecnico_'))
          .reduce((sum, [, v]) => sum + v, 0);
        const behavioralScore = Object.entries(leadScores)
          .filter(([k]) => k.startsWith('comportamental_'))
          .reduce((sum, [, v]) => sum + v, 0);
        const culturalScore = Object.entries(leadScores)
          .filter(([k]) => k.startsWith('cultural_'))
          .reduce((sum, [, v]) => sum + v, 0);

        scores = {
          final_score: totalScore,
          technical_score: technicalScore,
          behavioral_score: behavioralScore,
          cultural_score: culturalScore
        };

        // Converter scores em formato de resposta
        finalAnswers = Object.entries(leadScores).map(([key, value]) => {
          const [block, index] = key.split('_');
          const criteria = selectedForm.scoring_criteria[parseInt(index)];
          return {
            question_id: key,
            question_text: criteria?.criteria_name || key,
            answer: `Pontuação: ${value}/${criteria?.max_points || 10}`,
            score: value
          };
        });
      } else {
        scores = ScoreCalculator.calculate(answers);
        finalAnswers = answers;
      }
      
      const interviewData = {
        candidate_id: candidateId,
        workshop_id: workshop.id,
        interviewer_id: user.id,
        interview_date: new Date().toISOString(),
        form_used_id: selectedForm?.id || null,
        form_used_name: selectedForm?.form_name || null,
        script_used_id: selectedScript?.id || null,
        script_content: selectedScript ? JSON.stringify({
          mission: selectedScript.mission,
          vision: selectedScript.vision,
          values: selectedScript.values,
          growth_opportunities: selectedScript.growth_opportunities,
          not_fit_profile: selectedScript.not_fit_profile
        }) : null,
        answers: finalAnswers,
        ...scores,
        recommendation,
        interviewer_notes: interviewerNotes,
        completed: true
      };

      const interview = await base44.entities.CandidateInterview.create(interviewData);

      await base44.entities.Candidate.update(candidateId, {
        status: 'em_entrevista',
        lead_score: scores.final_score,
        technical_score: scores.technical_score,
        behavioral_score: scores.behavioral_score,
        cultural_score: scores.cultural_score,
        interviewer_recommendation: recommendation,
        interviewer_notes: interviewerNotes
      });

      return interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
      toast.success("Entrevista salva com sucesso!");
      navigate(-1);
    }
  });

  const saveCultureScriptMutation = useMutation({
    mutationFn: async (data) => {
      if (cultureScript?.id) {
        return await base44.entities.CultureScript.update(cultureScript.id, data);
      } else {
        return await base44.entities.CultureScript.create({
          ...data,
          workshop_id: workshop.id,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['culture-script'] });
    }
  });

  if (!candidate) {
    return <div className="p-6">Carregando...</div>;
  }

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🅴 ENTREVISTA</h1>
            <p className="text-gray-600">Candidato: {candidate.full_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPPE(true)}>
              <ClipboardList className="w-4 h-4 mr-2" />
              PPE
            </Button>
            <Button variant="outline" onClick={() => setShowDreamScript(true)}>
              <Search className="w-4 h-4 mr-2" />
              Script de Sonho
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        <Card className="p-6">
          {selectedForm && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Formulário Selecionado</p>
                <p className="text-sm text-blue-700">{selectedForm.form_name}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedForm(null)}>
                Remover
              </Button>
            </div>
          )}
          {selectedScript && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Script Selecionado</p>
                <p className="text-sm text-green-700">Script de cultura registrado</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedScript(null)}>
                Remover
              </Button>
            </div>
          )}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Progresso</span>
              <span className="text-sm font-medium">{currentStep + 1} / {questions.length}</span>
            </div>
            <Progress value={progress} />
          </div>

          {selectedForm?.is_lead_score_form ? (
            <LeadScoreInterviewForm
              form={selectedForm}
              currentStep={currentStep}
              scores={leadScores}
              onScoreChange={(key, value) => setLeadScores({...leadScores, [key]: value})}
              onStepChange={setCurrentStep}
              interviewerNotes={interviewerNotes}
              onNotesChange={setInterviewerNotes}
              recommendation={recommendation}
              onRecommendationChange={setRecommendation}
              onSubmit={() => saveInterviewMutation.mutate()}
              isLoading={saveInterviewMutation.isPending}
            />
          ) : (
            <InterviewForm
              questions={questions}
              currentStep={currentStep}
              answers={answers}
              onAnswerChange={setAnswers}
              onStepChange={setCurrentStep}
              interviewerNotes={interviewerNotes}
              onNotesChange={setInterviewerNotes}
              recommendation={recommendation}
              onRecommendationChange={setRecommendation}
              onSubmit={() => saveInterviewMutation.mutate()}
              isLoading={saveInterviewMutation.isPending}
            />
          )}
        </Card>

        <DreamScriptModal
          open={showDreamScript}
          onClose={() => setShowDreamScript(false)}
          workshop={workshop}
          script={cultureScript}
          onSave={(data) => saveCultureScriptMutation.mutate(data)}
          onSelectScript={(script) => {
            setSelectedScript(script);
            setShowDreamScript(false);
            toast.success("Script selecionado para esta entrevista");
          }}
        />

        <InterviewFormsManager
          open={showPPE}
          onClose={() => setShowPPE(false)}
          workshopId={workshop?.id}
          onSelectForm={(form) => {
            setSelectedForm(form);
            setAnswers([]);
            setLeadScores({});
            setCurrentStep(0);
            setShowPPE(false);
            toast.success(`Formulário "${form.form_name}" selecionado`);
          }}
        />
      </div>
    </div>
  );
}