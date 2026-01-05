import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { maturityQuestions } from "@/components/maturity/MaturityQuestions";

export default function AutoavaliacaoMaturidade() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
      } else {
        toast.error("Perfil de colaborador não encontrado");
        navigate(createPageUrl("MeuPerfil"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option) => {
    const newAnswers = [...answers, { question_id: currentQuestion, selected_option: option }];
    setAnswers(newAnswers);

    if (currentQuestion < maturityQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitAutoEvaluation(newAnswers);
    }
  };

  const submitAutoEvaluation = async (finalAnswers) => {
    try {
      const scores = { bebe: 0, crianca: 0, adolescente: 0, adulto: 0 };
      finalAnswers.forEach(answer => {
        const question = maturityQuestions[answer.question_id];
        scores[question.options[answer.selected_option]] += 1;
      });

      const maxScore = Math.max(...Object.values(scores));
      const dominantLevel = Object.keys(scores).find(key => scores[key] === maxScore);

      const diagnostic = await base44.entities.CollaboratorMaturityDiagnostic.create({
        employee_id: employee.id,
        evaluator_id: user.id,
        workshop_id: employee.workshop_id,
        evaluation_type: 'self',
        answers: finalAnswers,
        maturity_level: dominantLevel,
        maturity_scores: scores,
        completed: true
      });

      toast.success("Autoavaliação concluída!");
      navigate(createPageUrl("ResultadoMaturidade") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const question = maturityQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / maturityQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-2xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Autoavaliação de Maturidade
            </CardTitle>
            <p className="text-blue-100 text-sm mt-1">
              Pergunta {currentQuestion + 1} de {maturityQuestions.length}
            </p>
            <div className="w-full bg-blue-300 rounded-full h-2 mt-3">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{question.question}</h3>
            <div className="space-y-3">
              {Object.entries(question.options).map(([key, value]) => (
                <Button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4 px-6 hover:bg-blue-50 hover:border-blue-400 transition-all"
                >
                  <span className="font-semibold text-blue-600 mr-3">{key}.</span>
                  <span className="text-gray-700">{question.labels[key]}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}