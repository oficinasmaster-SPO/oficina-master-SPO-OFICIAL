import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, AlertCircle } from "lucide-react";
import { discQuestions } from "../components/disc/DISCQuestions";
import { toast } from "sonner";

export default function DiagnosticoDISC() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [answers, setAnswers] = useState({});

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

      // Inicializar respostas
      const initialAnswers = {};
      discQuestions.forEach(q => {
        initialAnswers[q.id] = { d: 0, i: 0, s: 0, c: 0 };
      });
      setAnswers(initialAnswers);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoDISC"));
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (questionId, profile, value) => {
    const numValue = parseInt(value) || 0;
    
    // Validar que a soma dos 4 perfis seja exatamente 10 (1+2+3+4)
    const current = { ...answers[questionId], [profile]: numValue };
    const sum = current.d + current.i + current.s + current.c;
    
    if (sum > 10) {
      toast.error("A soma das pontuações deve ser 10 (use 1, 2, 3 e 4 sem repetir)");
      return;
    }
    
    setAnswers({
      ...answers,
      [questionId]: current
    });
  };

  const validateAnswers = () => {
    for (let i = 1; i <= 10; i++) {
      const answer = answers[i];
      const sum = answer.d + answer.i + answer.s + answer.c;
      
      if (sum !== 10) {
        toast.error(`Pergunta ${i}: A soma deve ser 10 (use 1, 2, 3 e 4 sem repetir)`);
        return false;
      }
      
      const values = [answer.d, answer.i, answer.s, answer.c].sort();
      if (values[0] !== 1 || values[1] !== 2 || values[2] !== 3 || values[3] !== 4) {
        toast.error(`Pergunta ${i}: Use exatamente 1, 2, 3 e 4 (sem repetir)`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Selecione o colaborador a ser avaliado");
      return;
    }

    if (!validateAnswers()) {
      return;
    }

    setSubmitting(true);

    try {
      // Calcular totais
      let totalD = 0, totalI = 0, totalS = 0, totalC = 0;
      
      const answersArray = Object.entries(answers).map(([questionId, scores]) => {
        totalD += scores.d;
        totalI += scores.i;
        totalS += scores.s;
        totalC += scores.c;
        
        return {
          question_id: parseInt(questionId),
          d_score: scores.d,
          i_score: scores.i,
          s_score: scores.s,
          c_score: scores.c
        };
      });

      // Calcular percentuais
      const total = totalD + totalI + totalS + totalC;
      const profileScores = {
        executor_d: (totalD / total) * 100,
        comunicador_i: (totalI / total) * 100,
        planejador_s: (totalS / total) * 100,
        analista_c: (totalC / total) * 100
      };

      // Determinar perfil dominante
      const dominant = Object.keys(profileScores).reduce((a, b) => 
        profileScores[a] > profileScores[b] ? a : b
      );

      // Recomendar funções
      const recommendedRoles = getRecommendedRoles(profileScores);

      const diagnostic = await base44.entities.DISCDiagnostic.create({
        employee_id: selectedEmployee,
        evaluator_id: user.id,
        workshop_id: workshop?.id || null,
        is_leader: isLeader,
        team_name: teamName || null,
        answers: answersArray,
        profile_scores: profileScores,
        dominant_profile: dominant,
        recommended_roles: recommendedRoles,
        completed: true
      });

      toast.success("Teste DISC concluído!");
      navigate(createPageUrl("ResultadoDISC") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSubmitting(false);
    }
  };

  const getRecommendedRoles = (scores) => {
    const roles = [];
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top1 = sorted[0][0];
    const top2 = sorted[1][0];

    // Baseado nos perfis dominantes
    if (top1 === "executor_d" || top2 === "executor_d") {
      if (scores.executor_d > 30) {
        roles.push("Gerente Geral", "Líder de Equipe", "Coordenador de Produção");
      }
    }
    
    if (top1 === "comunicador_i" || top2 === "comunicador_i") {
      if (scores.comunicador_i > 30) {
        roles.push("Consultor de Vendas", "Atendimento ao Cliente", "Marketing");
      }
    }
    
    if (top1 === "planejador_s" || top2 === "planejador_s") {
      if (scores.planejador_s > 30) {
        roles.push("Coordenador Administrativo", "Supervisor de Processos", "Planejador");
      }
    }
    
    if (top1 === "analista_c" || top2 === "analista_c") {
      if (scores.analista_c > 30) {
        roles.push("Analista de Qualidade", "Controlador Financeiro", "Técnico Especialista");
      }
    }

    return roles.length > 0 ? roles : ["Função a definir conforme necessidade da oficina"];
  };

  const getFilledQuestions = () => {
    return Object.values(answers).filter(a => {
      const sum = a.d + a.i + a.s + a.c;
      return sum === 10;
    }).length;
  };

  const progress = (getFilledQuestions() / 10) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Teste DISC de Perfil Comportamental
          </h1>
          <p className="text-lg text-gray-600">
            Avaliação baseada na metodologia DEUSA - Oficinas Master
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Colaborador */}
          <Card className="border-2 border-indigo-200">
            <CardHeader>
              <CardTitle>Dados do Avaliado</CardTitle>
              <CardDescription>Selecione o colaborador e defina se é líder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Colaborador *</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome da Equipe (opcional)</Label>
                  <Input
                    placeholder="Ex: Equipe de Vendas"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-leader"
                  checked={isLeader}
                  onCheckedChange={setIsLeader}
                />
                <Label htmlFor="is-leader" className="font-normal">
                  Este colaborador é líder de equipe
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Progresso */}
          <div className="bg-white rounded-lg p-4 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progresso: {getFilledQuestions()}/10 questões
              </span>
              <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Instruções */}
          <Card className="bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <strong>Como preencher:</strong> Para cada grupo de características, 
                  distribua os números 1, 2, 3 e 4 (sem repetir) conforme o que mais se identifica com você:
                  <br />• 4 = Característica mais forte
                  <br />• 3 = Segunda característica mais forte
                  <br />• 2 = Terceira característica
                  <br />• 1 = Característica menos presente
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questões */}
          {discQuestions.map((question) => (
            <Card key={question.id} className="border-2">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="text-lg">Conjunto {question.id}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* (D) Executor */}
                  <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        D
                      </div>
                      <span className="font-semibold text-red-900">Executor</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 min-h-[60px]">{question.traits.d}</p>
                    <Select
                      value={answers[question.id]?.d?.toString() || ""}
                      onValueChange={(value) => updateAnswer(question.id, 'd', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Nota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* (I) Comunicador */}
                  <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                        I
                      </div>
                      <span className="font-semibold text-amber-900">Comunicador</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 min-h-[60px]">{question.traits.i}</p>
                    <Select
                      value={answers[question.id]?.i?.toString() || ""}
                      onValueChange={(value) => updateAnswer(question.id, 'i', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Nota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* (S) Planejador */}
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                        S
                      </div>
                      <span className="font-semibold text-green-900">Planejador</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 min-h-[60px]">{question.traits.s}</p>
                    <Select
                      value={answers[question.id]?.s?.toString() || ""}
                      onValueChange={(value) => updateAnswer(question.id, 's', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Nota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* (C) Analista */}
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        C
                      </div>
                      <span className="font-semibold text-blue-900">Analista</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 min-h-[60px]">{question.traits.c}</p>
                    <Select
                      value={answers[question.id]?.c?.toString() || ""}
                      onValueChange={(value) => updateAnswer(question.id, 'c', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Nota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitting || getFilledQuestions() < 10}
              className="bg-indigo-600 hover:bg-indigo-700 text-lg px-12 py-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  Finalizar Teste DISC
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}