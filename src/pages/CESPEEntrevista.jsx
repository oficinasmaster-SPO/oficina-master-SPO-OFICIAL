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
  const [criteriaObservations, setCriteriaObservations] = useState({});
  const [criteriaAudios, setCriteriaAudios] = useState({});
  const [checklistSelections, setChecklistSelections] = useState({});

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
    queryKey: ['interview-questions', workshop?.id, currentForm?.form_id, candidate?.desired_position],
    queryFn: async () => {
      if (currentForm?.is_lead_score) {
        // 🔥 AUTOMAÇÃO: Injetar checklists automaticamente baseado no cargo do candidato
        const criteria = currentForm.form_data?.scoring_criteria || [];
        
        // Mapear cargo desejado para job_role e detectar sub-especializações
        const jobRoleMap = {
          'vendedor': 'vendas',
          'vendas': 'vendas',
          'consultor de vendas': 'vendas',
          'telemarketing': 'telemarketing',
          'comercial': 'telemarketing',
          'sdr': 'telemarketing',
          'mecânico': 'tecnico',
          'técnico': 'tecnico',
          'eletricista': 'tecnico',
          'funileiro': 'tecnico',
          'lanterneiro': 'tecnico',
          'financeiro': 'financeiro',
          'administrativo': 'administrativo',
          'estoque': 'estoque'
        };

        const desiredPosition = (candidate?.desired_position || '').toLowerCase().trim();
        let detectedJobRole = null;
        
        console.log('🔍 DEBUG - Cargo do candidato (RAW):', candidate?.desired_position);
        console.log('🔍 DEBUG - Cargo normalizado:', desiredPosition);
        
        // Buscar correspondência no mapa
        for (const [key, role] of Object.entries(jobRoleMap)) {
          if (desiredPosition.includes(key)) {
            detectedJobRole = role;
            console.log('✅ Match encontrado:', key, '→', role);
            break;
          }
        }

        // Fallback: se não detectou nada, tentar usar direto o valor do campo
        if (!detectedJobRole) {
          console.log('⚠️ Nenhum match encontrado no mapa. Tentando valor direto...');
          // Verificar se o valor é exatamente um dos job_roles válidos
          const validRoles = ['vendas', 'telemarketing', 'tecnico', 'financeiro', 'administrativo', 'estoque'];
          if (validRoles.includes(desiredPosition)) {
            detectedJobRole = desiredPosition;
            console.log('✅ Usando valor direto:', detectedJobRole);
          } else {
            detectedJobRole = 'tecnico'; // último fallback
            console.log('❌ Nenhum cargo válido detectado. Usando fallback: tecnico');
          }
        }

        // Detectar sub-especializações (ex: "linha pesada", "funilaria")
        let specialization = '';
        if (desiredPosition.includes('linha pesada') || desiredPosition.includes('pesado')) {
          specialization = 'linha pesada';
        } else if (desiredPosition.includes('funilaria') || desiredPosition.includes('funileiro') || desiredPosition.includes('lanternagem')) {
          specialization = 'funilaria';
        }

        console.log('🎯 RESULTADO FINAL - Cargo detectado:', detectedJobRole, specialization ? `(${specialization})` : '');

        // Buscar checklists automáticos para o cargo
        const allChecklists = await base44.entities.ChecklistTemplate.filter({
          workshop_id: workshop.id,
          job_role: detectedJobRole,
          is_active: true
        });

        // Filtrar por especialização (se detectada)
        const checklists = specialization 
          ? allChecklists.filter(c => c.template_name?.toLowerCase().includes(specialization))
          : allChecklists;

        console.log('📋 Checklists encontrados:', checklists.length, specialization ? `(filtrados por: ${specialization})` : '');

        // Injetar checklists automaticamente nos critérios correspondentes
        const enrichedCriteria = criteria.map(criterion => {
          // Mapear tipo de critério para checklist_type
          const typeMap = {
            'conhecimento técnico': 'conhecimento_tecnico',
            'conhecimento': 'conhecimento_tecnico',
            'técnico': 'conhecimento_tecnico',
            'experiência prática': 'experiencia_pratica',
            'experiência': 'experiencia_pratica',
            'prática': 'experiencia_pratica',
            'capacidade de diagnóstico': 'capacidade_diagnostico',
            'capacidade': 'capacidade_diagnostico',
            'diagnóstico': 'capacidade_diagnostico',
            'habilidades de vendas': 'habilidades_vendas',
            'habilidades vendas': 'habilidades_vendas',
            'atendimento ao cliente': 'atendimento_cliente',
            'atendimento': 'atendimento_cliente',
            'organização': 'organizacao',
            'financeiro': 'financeiro'
          };

          const criterionNameLower = criterion.criteria_name?.toLowerCase() || '';
          let matchedChecklistType = null;

          for (const [key, type] of Object.entries(typeMap)) {
            if (criterionNameLower.includes(key)) {
              matchedChecklistType = type;
              break;
            }
          }

          if (matchedChecklistType) {
            const matchedChecklist = checklists.find(c => c.checklist_type === matchedChecklistType);
            
            if (matchedChecklist) {
              console.log('✅ Checklist injetado:', criterion.criteria_name, '→', matchedChecklist.template_name);
              // 🔥 FORÇAR sobrescrever checklist (ignorar o que está salvo no form)
              return {
                ...criterion,
                has_checklist: true,
                checklist_items: matchedChecklist.items, // SEMPRE sobrescreve
                job_role: detectedJobRole,
                checklist_type: matchedChecklistType
              };
            }
          }

          // Se não encontrou checklist, REMOVER qualquer checklist antigo
          return {
            ...criterion,
            has_checklist: false,
            checklist_items: [],
            job_role: detectedJobRole
          };
        });

        return enrichedCriteria;
      }
      if (currentForm?.form_data) {
        return currentForm.form_data.questions || [];
      }
      if (!workshop?.id) return [];
      const all = await base44.entities.InterviewQuestion.filter({ active: true });
      return all.filter(q => !q.workshop_id || q.workshop_id === workshop.id);
    },
    enabled: !!workshop?.id && !!currentForm && !!candidate
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
            score: value,
            observation: criteriaObservations[key] || "",
            audio_url: criteriaAudios[key] || null,
            checklist_selected: checklistSelections[key] || []
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

      // Calcular nível de senioridade automaticamente
      const finalScore = aggregatedScores.final_score;
      let seniorityLevel = "junior";
      if (finalScore >= 85) {
        seniorityLevel = "master";
      } else if (finalScore >= 70) {
        seniorityLevel = "senior";
      } else if (finalScore >= 55) {
        seniorityLevel = "pleno";
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
        seniority_level: seniorityLevel,
        recommendation,
        interviewer_notes: interviewerNotes,
        completed: updatedForms.every(f => f.completed)
      };

      const interview = await base44.entities.CandidateInterview.create(interviewData);

      await base44.entities.Candidate.update(candidateId, {
        status: 'em_entrevista',
        lead_score: aggregatedScores.final_score,
        technical_score: aggregatedScores.technical_score,
        behavioral_score: aggregatedScores.behavioral_score,
        cultural_score: aggregatedScores.cultural_score,
        interviewer_recommendation: recommendation,
        interviewer_notes: interviewerNotes,
        timeline: [
          ...(candidate.timeline || []),
          {
            timestamp: new Date().toISOString(),
            action: 'Entrevista realizada',
            user_id: user.id,
            details: `Score: ${aggregatedScores.final_score} | Forms: ${updatedForms.length}`
          }
        ]
      });

      return interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      
      // Verificar se há mais formulários a responder
      const nextIncomplete = attachedForms.findIndex((f, i) => i > currentFormIndex && !f.completed);
      
      if (nextIncomplete !== -1) {
        // Limpar estado e ir para próximo formulário
        setCurrentFormIndex(nextIncomplete);
        setCurrentStep(0);
        setAnswers([]);
        setLeadScores({});
        setCriteriaObservations({});
        setCriteriaAudios({});
        setChecklistSelections({});
        toast.success("Formulário salvo! Responda o próximo formulário.");
      } else {
        toast.success("Entrevista completa salva com sucesso!");
        navigate(-1);
      }
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

  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

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

        <AttachedFormsList
          attachedForms={attachedForms}
          currentFormId={currentForm?.form_id}
          onRemove={(formId) => {
            const newForms = attachedForms.filter(f => f.form_id !== formId);
            setAttachedForms(newForms);
            if (currentFormIndex >= newForms.length) {
              setCurrentFormIndex(Math.max(0, newForms.length - 1));
            }
            toast.success("Formulário removido");
          }}
          onSelectForm={(form) => {
            const index = attachedForms.findIndex(f => f.form_id === form.form_id);
            if (index !== -1) {
              setCurrentFormIndex(index);
              setCurrentStep(0);
              setAnswers(form.answers || []);
              setLeadScores({});
              setCriteriaObservations({});
              setCriteriaAudios({});
              setChecklistSelections({});
            }
          }}
        />

        {selectedScript && (
          <Card className="mt-4 border-2 border-green-200">
            <div className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Script Selecionado</p>
                <p className="text-sm text-green-700">Script de cultura registrado</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedScript(null)}>
                Remover
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6 mt-4">
          {currentForm && (
            <>
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    Progresso - {currentForm.form_name}
                  </span>
                  <span className="text-sm font-medium">{currentStep + 1} / {questions.length}</span>
                </div>
                <Progress value={progress} />
              </div>

          {currentForm?.is_lead_score ? (
            <LeadScoreInterviewForm
              form={currentForm.form_data}
              currentStep={currentStep}
              scores={leadScores}
              onScoreChange={(key, value) => setLeadScores({...leadScores, [key]: value})}
              criteriaObservations={criteriaObservations}
              onObservationChange={(key, value) => setCriteriaObservations({...criteriaObservations, [key]: value})}
              criteriaAudios={criteriaAudios}
              onAudioChange={(key, url) => setCriteriaAudios({...criteriaAudios, [key]: url})}
              checklistSelections={checklistSelections}
              onChecklistChange={(key, selections) => setChecklistSelections({...checklistSelections, [key]: selections})}
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
            </>
          )}

          {!currentForm && (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Nenhum formulário anexado</p>
              <Button onClick={() => setShowPPE(true)}>
                Anexar Formulário
              </Button>
            </div>
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
              setCriteriaObservations({});
              setCriteriaAudios({});
              setChecklistSelections({});
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