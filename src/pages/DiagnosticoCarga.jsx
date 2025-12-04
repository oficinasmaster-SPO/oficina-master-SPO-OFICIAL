import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Brain } from "lucide-react";
import { toast } from "sonner";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      
      if (!userWorkshop) {
        toast.error("Oficina não encontrada");
        navigate(createPageUrl("Home"));
        return;
      }
      setWorkshop(userWorkshop);
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

      // Use backend function for consistent creation (using the new consolidated function pattern)
      const response = await base44.functions.invoke('submitAppForms', {
        form_type: 'workload_diagnostic',
        workshop_id: workshop.id,
        answers: answers,
        overall_health,
        average_score: average
      });

      if (response.data.error) throw new Error(response.data.error);

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
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <DynamicHelpSystem pageName="DiagnosticoCarga" />
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
           <div className="flex justify-between items-center mb-2">
             <h1 className="text-2xl font-bold">Diagnóstico de Carga de Trabalho</h1>
             <span className="text-sm text-gray-500">{currentQuestion + 1}/{workloadQuestions.length}</span>
           </div>
           <Progress value={progress} className="h-2" />
        </div>

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
  );
}