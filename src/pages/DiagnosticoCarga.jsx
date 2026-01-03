import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Brain, User, LinkIcon, History, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";
import TrackingWrapper from "@/components/shared/TrackingWrapper";

const workloadQuestions = [
  {
    id: 1,
    question: "Como você avalia a distribuição de tarefas na sua equipe?",
    options: [
      { letter: "A", text: "Muito desequilibrada, alguns trabalham muito e outros pouco" },
      { letter: "B", text: "Desequilibrada, mas todos têm o que fazer" },
      { letter: "C", text: "Equilibrada na maior parte do tempo" },
      { letter: "D", text: "Perfeitamente distribuída de acordo com a capacidade" }
    ]
  },
  {
    id: 2,
    question: "Com que frequência sua equipe precisa fazer horas extras?",
    options: [
      { letter: "A", text: "Diariamente / Quase todos os dias" },
      { letter: "B", text: "Uma ou duas vezes por semana" },
      { letter: "C", text: "Raramente, apenas em picos sazonais" },
      { letter: "D", text: "Nunca, conseguimos entregar tudo no horário" }
    ]
  },
  {
    id: 3,
    question: "Como é o nível de estresse da equipe?",
    options: [
      { letter: "A", text: "Muito alto, ambiente tenso constantemente" },
      { letter: "B", text: "Alto em momentos de pico" },
      { letter: "C", text: "Normal, stress saudável de trabalho" },
      { letter: "D", text: "Baixo, ambiente muito tranquilo" }
    ]
  },
  {
    id: 4,
    question: "Os prazos de entrega aos clientes são cumpridos?",
    options: [
      { letter: "A", text: "Frequentemente atrasamos" },
      { letter: "B", text: "Às vezes atrasamos" },
      { letter: "C", text: "Raramente atrasamos" },
      { letter: "D", text: "Sempre entregamos no prazo ou antes" }
    ]
  },
  {
    id: 5,
    question: "Você tem clareza sobre a capacidade produtiva de cada colaborador?",
    options: [
      { letter: "A", text: "Não tenho ideia" },
      { letter: "B", text: "Tenho uma noção vaga" },
      { letter: "C", text: "Sei bem, mas não meço formalmente" },
      { letter: "D", text: "Sim, meço e acompanho indicadores de produtividade" }
    ]
  }
];

export default function DiagnosticoCarga() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [inviteLink, setInviteLink] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      let loadedWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (!loadedWorkshop) {
        const empList = await base44.entities.Employee.filter({ email: currentUser.email });
        if (empList.length > 0 && empList[0].workshop_id) {
            loadedWorkshop = workshops.find(w => w.id === empList[0].workshop_id);
        }
      }

      if (!loadedWorkshop) {
        toast.error("Oficina não encontrada");
        navigate(createPageUrl("Home"));
        return;
      }
      
      setWorkshop(loadedWorkshop);

      const activeEmployees = await base44.entities.Employee.filter({ 
        workshop_id: loadedWorkshop.id, 
        status: "ativo" 
      });
      setEmployees(activeEmployees || []);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoCarga"));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (letter) => {
    setAnswers({ ...answers, [workloadQuestions[currentQuestion].id]: letter });
  };

  const handleNext = () => {
    if (!answers[workloadQuestions[currentQuestion].id]) return;
    if (currentQuestion < workloadQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const response = await base44.functions.invoke('generateDiagnosticInvite', {
        workshop_id: workshop?.id,
        diagnostic_type: 'WORKLOAD'
      });

      if (response.data.success) {
        const link = `${window.location.origin}/${response.data.path}?token=${response.data.invite_token}`;
        setInviteLink(link);
      } else {
        toast.error("Erro ao gerar link");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar link");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado!");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calculate score (A=1, B=2, C=3, D=4)
      let totalScore = 0;
      Object.values(answers).forEach(letter => {
        if (letter === 'A') totalScore += 1;
        if (letter === 'B') totalScore += 2;
        if (letter === 'C') totalScore += 3;
        if (letter === 'D') totalScore += 4;
      });

      const average = totalScore / workloadQuestions.length;
      let overall_health = 'critico';
      if (average > 1.5) overall_health = 'atencao';
      if (average > 2.5) overall_health = 'bom';
      if (average > 3.5) overall_health = 'excelente';

      const response = await base44.functions.invoke('submitAppForms', {
        form_type: 'workload_diagnostic',
        workshop_id: workshop?.id,
        evaluator_id: user?.id,
        answers: answers,
        overall_health,
        average_score: average
      });

      if (response?.data?.error) throw new Error(response.data.error);

      toast.success("Diagnóstico concluído!");
      navigate(createPageUrl("ResultadoCarga") + `?id=${response.data.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const question = workloadQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / workloadQuestions.length) * 100;

  return (
    <TrackingWrapper
      workshopId={workshop?.id}
      itemTipo="diagnostico"
      itemId="diagnostico_carga"
      itemNome="Diagnóstico de Carga de Trabalho"
      itemCategoria="diagnosticos"
    >
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <DynamicHelpSystem pageName="DiagnosticoCarga" />
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <div>
               <h1 className="text-2xl font-bold text-gray-900">
                 Diagnóstico de Carga de Trabalho
               </h1>
               {workshop && (
                 <p className="text-sm text-gray-600 mt-1">
                   {workshop.name}
                 </p>
               )}
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <Button variant="outline" onClick={() => navigate(createPageUrl("Historico"))}>
                 <History className="w-4 h-4 mr-2" />
                 Histórico
               </Button>
               <Button onClick={() => setIsInviteModalOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                 <LinkIcon className="w-4 h-4 mr-2" />
                 Gerar Link
               </Button>
             </div>
           </div>
           
           <div className="flex justify-between text-sm text-gray-600 mb-2">
             <span>Pergunta {currentQuestion + 1} de {workloadQuestions.length}</span>
             <span>{progress.toFixed(0)}%</span>
           </div>
           <Progress value={progress} className="h-2" />
        </div>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link de Diagnóstico</DialogTitle>
              <DialogDescription>
                Envie este link para avaliação colaborativa da carga de trabalho.
              </DialogDescription>
            </DialogHeader>
            
            {!inviteLink ? (
              <div className="space-y-4 py-4">
                <p className="text-sm text-gray-600">
                  O link permitirá que outros membros da equipe respondam o diagnóstico.
                </p>
                <Button 
                  onClick={handleGenerateInvite} 
                  disabled={generatingInvite}
                  className="w-full"
                >
                  {generatingInvite ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : "Gerar Link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-50 rounded border border-green-200 text-center text-green-800">
                  Link gerado com sucesso!
                </div>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly />
                  <Button onClick={copyToClipboard} size="icon">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => { setInviteLink(""); setIsInviteModalOpen(false); }} 
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
            <div className="space-y-3">
              {question.options.map(opt => (
                <button
                  key={opt.letter}
                  onClick={() => handleAnswer(opt.letter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                    answers[question.id] === opt.letter 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    answers[question.id] === opt.letter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {opt.letter}
                  </div>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentQuestion === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <Button onClick={handleNext} disabled={!answers[question.id] || isSubmitting} className="bg-blue-600">
            {currentQuestion === workloadQuestions.length - 1 ? (
              isSubmitting ? <Loader2 className="animate-spin" /> : "Finalizar"
            ) : (
              <>Próxima <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
      </div>
    </TrackingWrapper>
  );
}