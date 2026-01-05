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
import AttachedFormsList from "@/components/cespe/AttachedFormsList";
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
  const [attachedForms, setAttachedForms] = useState([]);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
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

  const currentForm = attachedForms[currentFormIndex];

  const { data: questions = [] } = useQuery({
    queryKey: ['interview-questions', workshop?.id, currentForm?.form_id],
    queryFn: async () => {
      if (currentForm?.is_lead_score) {
        return currentForm.form_data?.scoring_criteria || [];
      }
      if (currentForm?.form_data) {
        return currentForm.form_data.questions || [];
      }
      if (!workshop?.id) return [];
      const all = await base44.entities.InterviewQuestion.filter({ active: true });
      return all.filter(q => !q.workshop_id || q.workshop_id === workshop.id);
    },
    enabled: !!workshop?.id && !!currentForm
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
      // Marcar formulário atual como completo
      const updatedForms = [...attachedForms];
      const currentForm = updatedForms[currentFormIndex];
      
      if (currentForm.is_lead_score) {
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
        const historicoScore = Object.entries(leadScores)
          .filter(([k]) => k.startsWith('historico_'))
          .reduce((sum, [, v]) => sum + v, 0);

        currentForm.scores = {
          total: totalScore,
          technical: technicalScore,
          behavioral: behavioralScore,
          cultural: culturalScore,
          historico: historicoScore
        };

        currentForm.answers = Object.entries(leadScores).map(([key, value]) => {
          const [block, index] = key.split('_');
          const criteria = currentForm.form_data.scoring_criteria[parseInt(index)];
          return {
            question_id: key,
            question_text: criteria?.criteria_name || key,
            answer: `Pontuação: ${value}/${criteria?.max_points || 10}`,
            score: value
          };
        });
      } else {
        currentForm.scores = ScoreCalculator.calculate(answers);
        currentForm.answers = answers;
      }
      
      currentForm.completed = true;
      updatedForms[currentFormIndex] = currentForm;

      // Calcular scores agregados considerando TODOS os formulários completados
      const completedForms = updatedForms.filter(f => f.completed);
      
      let aggregatedScores = {
        technical_score: 0,
        behavioral_score: 0,
        cultural_score: 0,
        final_score: 0
      };

      if (completedForms.length > 0) {
        // Somar scores técnicos e normalizar para manter peso 40%
        const techSum = completedForms.reduce((sum, f) => sum + (f.scores?.technical || f.scores?.technical_score || 0), 0);
        aggregatedScores.technical_score = Math.round((techSum / completedForms.length));

        // Somar scores comportamentais e normalizar para manter peso 30%
        const behavSum = completedForms.reduce((sum, f) => sum + (f.scores?.behavioral || f.scores?.behavioral_score || 0), 0);
        aggregatedScores.behavioral_score = Math.round((behavSum / completedForms.length));

        // Somar scores culturais e normalizar para manter peso 15%
        const cultSum = completedForms.reduce((sum, f) => sum + (f.scores?.cultural || f.scores?.cultural_score || 0), 0);
        aggregatedScores.cultural_score = Math.round((cultSum / completedForms.length));

        // Score final agregado
        aggregatedScores.final_score = Math.round(
          aggregatedScores.technical_score + 
          aggregatedScores.behavioral_score + 
          aggregatedScores.cultural_score +
          (completedForms.reduce((sum, f) => sum + (f.scores?.historico || 0), 0) / completedForms.length)
        );
      }
      
      const interviewData = {
        candidate_id: candidateId,
        workshop_id: workshop.id,
        interviewer_id: user.id,
        interview_date: new Date().toISOString(),
        forms_used: updatedForms,
        script_used_id: selectedScript?.id || null,
        script_content: selectedScript ? JSON.stringify({
          mission: selectedScript.mission,
          vision: selectedScript.vision,
          values: selectedScript.values,
          growth_opportunities: selectedScript.growth_opportunities,
          not_fit_profile: selectedScript.not_fit_profile
        }) : null,
        answers: currentForm.answers,
        ...aggregatedScores,
        recommendation,
        interviewer_notes: interviewerNotes,
        completed: updatedForms.every(f => f.completed)
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
              form={currentForm.form_data}
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
            // Adicionar formulário à lista de anexados
            const newAttachedForm = {
              form_id: form.id,
              form_name: form.form_name,
              form_type: form.form_type,
              is_lead_score: form.is_lead_score_form || false,
              form_data: form,
              completed: false,
              answers: [],
              scores: {}
            };
            
            // Verificar se já existe
            if (!attachedForms.find(f => f.form_id === form.id)) {
              const newForms = [...attachedForms, newAttachedForm];
              setAttachedForms(newForms);
              setCurrentFormIndex(newForms.length - 1);
              setCurrentStep(0);
              setAnswers([]);
              setLeadScores({});
              toast.success(`Formulário "${form.form_name}" anexado`);
            } else {
              toast.info("Formulário já está anexado");
            }
            setShowPPE(false);
          }}
        />
      </div>
    </div>
  );
}