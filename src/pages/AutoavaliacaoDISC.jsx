import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { discQuestions } from "@/components/disc/DISCQuestions";

export default function AutoavaliacaoDISC() {
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

  const handleAnswer = (scores) => {
    const newAnswers = [...answers, { question_id: currentQuestion, ...scores }];
    setAnswers(newAnswers);

    if (currentQuestion < discQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitAutoEvaluation(newAnswers);
    }
  };

  const submitAutoEvaluation = async (finalAnswers) => {
    try {
      const totals = { d_score: 0, i_score: 0, s_score: 0, c_score: 0 };
      finalAnswers.forEach(a => {
        totals.d_score += a.d_score || 0;
        totals.i_score += a.i_score || 0;
        totals.s_score += a.s_score || 0;
        totals.c_score += a.c_score || 0;
      });

      const maxScore = Math.max(totals.d_score, totals.i_score, totals.s_score, totals.c_score);
      const sum = Object.values(totals).reduce((a, b) => a + b, 0);

      const profileScores = {
        executor_d: (totals.d_score / sum) * 100,
        comunicador_i: (totals.i_score / sum) * 100,
        planejador_s: (totals.s_score / sum) * 100,
        analista_c: (totals.c_score / sum) * 100
      };

      let dominant = 'executor_d';
      if (totals.i_score === maxScore) dominant = 'comunicador_i';
      else if (totals.s_score === maxScore) dominant = 'planejador_s';
      else if (totals.c_score === maxScore) dominant = 'analista_c';

      const diagnostic = await base44.entities.DISCDiagnostic.create({
        employee_id: employee.id,
        evaluator_id: user.id,
        workshop_id: employee.workshop_id,
        evaluation_type: 'self',
        answers: finalAnswers,
        profile_scores: profileScores,
        dominant_profile: dominant,
        completed: true
      });

      toast.success("Autoavaliação DISC concluída!");
      navigate(createPageUrl("ResultadoDISC") + `?id=${diagnostic.id}`);
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

  const question = discQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / discQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-2xl border-2 border-purple-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Autoavaliação DISC - {employee?.full_name}
            </CardTitle>
            <p className="text-purple-100 text-sm mt-1">
              Pergunta {currentQuestion + 1} de {discQuestions.length}
            </p>
            <div className="w-full bg-purple-300 rounded-full h-2 mt-3">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Ordene os traços de 1 a 4 (1 = mais parecido com você, 4 = menos parecido)
            </h3>
            <DISCQuestionCard 
              question={question}
              onAnswer={handleAnswer}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DISCQuestionCard({ question, onAnswer }) {
  const [scores, setScores] = useState({ d_score: 0, i_score: 0, s_score: 0, c_score: 0 });
  const [selected, setSelected] = useState({});

  const handleSelect = (trait, value) => {
    // Validar se o número já foi usado
    const usedNumbers = Object.entries(selected)
      .filter(([key]) => key !== trait)
      .map(([, val]) => val);

    if (usedNumbers.includes(value)) {
      toast.error(`Número ${value} já foi usado. Escolha outro número (1-4).`);
      return;
    }

    const newSelected = { ...selected, [trait]: value };
    setSelected(newSelected);

    const newScores = {
      d_score: newSelected.d ? (5 - newSelected.d) : 0,
      i_score: newSelected.i ? (5 - newSelected.i) : 0,
      s_score: newSelected.s ? (5 - newSelected.s) : 0,
      c_score: newSelected.c ? (5 - newSelected.c) : 0
    };
    setScores(newScores);

    if (Object.keys(newSelected).length === 4) {
      setTimeout(() => onAnswer(newScores), 300);
    }
  };

  const isNumberUsed = (num) => {
    return Object.values(selected).includes(num);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4">
        <p className="text-sm text-amber-900">
          <strong>⚠️ Use cada número apenas uma vez:</strong> Ordene as características de 1 (menos) a 4 (mais).
        </p>
      </div>
      {Object.entries(question.traits).map(([key, trait]) => (
        <div key={key} className="border-2 rounded-lg p-4 hover:border-purple-300 transition-colors bg-white">
          <p className="text-gray-700 mb-3 font-medium">{trait}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(val => (
              <Button
                key={val}
                variant={selected[key] === val ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelect(key, val)}
                disabled={isNumberUsed(val) && selected[key] !== val}
                className={`${selected[key] === val ? "bg-purple-600" : ""} ${isNumberUsed(val) && selected[key] !== val ? "opacity-40" : ""}`}
              >
                {val}
              </Button>
            ))}
          </div>
          {selected[key] && (
            <p className="text-xs text-green-600 mt-2">✓ Selecionado: {selected[key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}