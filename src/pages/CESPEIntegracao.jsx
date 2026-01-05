import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnboardingTimeline from "@/components/cespe/OnboardingTimeline";
import OnboardingChecklist from "@/components/cespe/OnboardingChecklistView";

export default function CESPEIntegracao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const candidateId = urlParams.get('candidate_id');

  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

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

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', candidateId],
    queryFn: async () => {
      const checklists = await base44.entities.OnboardingChecklist.filter({ candidate_id: candidateId });
      return checklists && checklists.length > 0 ? checklists[0] : null;
    },
    enabled: !!candidateId
  });

  const createOnboardingMutation = useMutation({
    mutationFn: async () => {
      const defaultItems = [
        { title: "Boas-vindas e tour pela empresa", category: "dia_1", responsible_id: user.id },
        { title: "Apresentação da cultura e valores", category: "dia_1", responsible_id: user.id },
        { title: "Assinatura de documentos", category: "dia_1", responsible_id: user.id },
        { title: "Configuração de sistemas", category: "semana_1", responsible_id: user.id },
        { title: "Treinamento inicial", category: "semana_1", responsible_id: user.id },
        { title: "Reunião de alinhamento 30 dias", category: "30_dias", responsible_id: user.id },
        { title: "Avaliação de desempenho 60 dias", category: "60_dias", responsible_id: user.id },
        { title: "Feedback e plano de desenvolvimento 90 dias", category: "90_dias", responsible_id: user.id }
      ];

      return await base44.entities.OnboardingChecklist.create({
        candidate_id: candidateId,
        workshop_id: workshop.id,
        start_date: new Date().toISOString().split('T')[0],
        items: defaultItems,
        completion_percentage: 0,
        status: 'em_andamento'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success("Onboarding iniciado!");
    }
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemIndex, completed }) => {
      const items = [...onboarding.items];
      items[itemIndex] = {
        ...items[itemIndex],
        completed,
        completed_date: completed ? new Date().toISOString() : null,
        completed_by: completed ? user.id : null
      };

      const completedCount = items.filter(i => i.completed).length;
      const percentage = (completedCount / items.length) * 100;

      return await base44.entities.OnboardingChecklist.update(onboarding.id, {
        items,
        completion_percentage: percentage,
        status: percentage === 100 ? 'concluido' : 'em_andamento'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    }
  });

  if (!candidate || !workshop) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🅸 INTEGRAÇÃO - Onboarding Completo</h1>
            <p className="text-gray-600">Candidato: {candidate.full_name}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {!onboarding ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">Iniciar Onboarding</h3>
            <p className="text-gray-600 mb-6">
              Crie um cronograma de integração para {candidate.full_name}
            </p>
            <Button onClick={() => createOnboardingMutation.mutate()}>
              Iniciar Integração
            </Button>
          </Card>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold">Progresso da Integração</h3>
                  <p className="text-sm text-gray-600">
                    {onboarding.items.filter(i => i.completed).length} de {onboarding.items.length} concluídos
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(onboarding.completion_percentage)}%
                  </div>
                </div>
              </div>
              <Progress value={onboarding.completion_percentage} />
            </Card>

            <OnboardingTimeline onboarding={onboarding} />

            <OnboardingChecklist
              onboarding={onboarding}
              onToggle={(itemIndex, completed) => 
                toggleItemMutation.mutate({ itemIndex, completed })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}