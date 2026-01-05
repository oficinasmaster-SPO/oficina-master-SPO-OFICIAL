import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import InterviewForm from "@/components/cespe/InterviewForm";
import ScoreCalculator from "@/components/cespe/ScoreCalculator";

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
    queryKey: ['interview-questions', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const all = await base44.entities.InterviewQuestion.filter({ active: true });
      return all.filter(q => !q.workshop_id || q.workshop_id === workshop.id);
    },
    enabled: !!workshop?.id
  });

  const saveInterviewMutation = useMutation({
    mutationFn: async (data) => {
      const scores = ScoreCalculator.calculate(answers);
      
      const interviewData = {
        candidate_id: candidateId,
        workshop_id: workshop.id,
        interviewer_id: user.id,
        interview_date: new Date().toISOString(),
        answers,
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
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Progresso</span>
              <span className="text-sm font-medium">{currentStep + 1} / {questions.length}</span>
            </div>
            <Progress value={progress} />
          </div>

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
        </Card>
      </div>
    </div>
  );
}