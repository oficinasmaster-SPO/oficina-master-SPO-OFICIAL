import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, User } from "lucide-react";
import { maturityQuestions, answerMapping } from "../components/maturity/MaturityQuestions";
import { toast } from "sonner";

export default function DiagnosticoMaturidade() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [workshop, setWorkshop] = useState(null);

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

      const allEmployees = await base44.entities.Employee.list();
      const activeEmployees = allEmployees.filter(e => 
        e.status === "ativo" && (!userWorkshop || e.workshop_id === userWorkshop.id)
      );
      setEmployees(activeEmployees);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoMaturidade"));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentQuestion + 1) / maturityQuestions.length) * 100;
  const question = maturityQuestions[currentQuestion];

  const handleAnswer = (letter) => {
    setAnswers({ ...answers, [question.id]: letter });
  };

  const handleNext = () => {
    if (!selectedEmployee && currentQuestion === 0) {
      toast.error("Por favor, selecione o colaborador a ser avaliado");
      return;
    }

    if (!answers[question.id]) {
      toast.error("Por favor, selecione uma resposta");
      return;
    }
    
    if (currentQuestion < maturityQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const scores = { bebe: 0, crianca: 0, adolescente: 0, adulto: 0 };
      
      const answersArray = Object.entries(answers).map(([questionId, letter]) => {
        const maturityLevel = answerMapping[parseInt(questionId)][letter];
        scores[maturityLevel]++;
        
        return {
          question_id: parseInt(questionId),
          selected_option: letter
        };
      });
      
      const dominantLevel = Object.keys(scores).reduce((a, b) => 
        scores[a] > scores[b] ? a : b
      );
      
      const diagnostic = await base44.entities.CollaboratorMaturityDiagnostic.create({
        employee_id: selectedEmployee,
        evaluator_id: user.id,
        workshop_id: workshop?.id || null,
        answers: answersArray,
        maturity_level: dominantLevel,
        maturity_scores: scores,
        completed: true
      });
      
      toast.success("Diagnóstico de maturidade concluído!");
      navigate(createPageUrl("ResultadoMaturidade") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Análise do Nível de Maturidade do(a) Colaborador(a)
              </h1>
              {workshop && (
                <p className="text-sm text-gray-600 mt-1">
                  {workshop.name}
                </p>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Pergunta {currentQuestion + 1} de {maturityQuestions.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentQuestion === 0 && !selectedEmployee && (
          <Card className="shadow-lg border-2 border-purple-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold text-gray-900 mb-3 block">
                    Selecione o(a) Colaborador(a) para Avaliar
                  </Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha um colaborador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum colaborador cadastrado
                        </SelectItem>
                      ) : (
                        employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name} - {emp.position}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-2">
                    Esta avaliação ajudará a identificar o nível de maturidade profissional e definir a melhor forma de gestão.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl border-2">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="text-xs font-semibold text-purple-600 mb-2 uppercase tracking-wider">
                Questão {question.id}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                {question.question}
              </h2>
            </div>

            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  onClick={() => handleAnswer(option.letter)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[question.id] === option.letter
                      ? "border-purple-600 bg-purple-50 shadow-md"
                      : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      answers[question.id] === option.letter
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {option.letter}
                    </div>
                    <p className="text-gray-700 flex-1 leading-relaxed">
                      {option.text}
                    </p>
                    {answers[question.id] === option.letter && (
                      <CheckCircle2 className="flex-shrink-0 w-6 h-6 text-purple-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentQuestion === 0}
            className="px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={(!selectedEmployee && currentQuestion === 0) || !answers[question.id] || isSubmitting}
            className="px-6 bg-purple-600 hover:bg-purple-700"
          >
            {currentQuestion === maturityQuestions.length - 1 ? (
              isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Finalizar Avaliação"
              )
            ) : (
              <>
                Próxima
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}