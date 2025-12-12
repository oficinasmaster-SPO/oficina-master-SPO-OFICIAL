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
import { Loader2, Brain, AlertCircle, CheckCircle2, Link as LinkIcon, History, Copy, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { discQuestions } from "../components/disc/DISCQuestions";
import { toast } from "sonner";
import TrackingWrapper from "@/components/shared/TrackingWrapper";

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
  const [inviteLink, setInviteLink] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [candidateName, setCandidateName] = useState("");

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

      // Inicializar respostas vazias
      const initialAnswers = {};
      discQuestions.forEach(q => {
        initialAnswers[q.id] = { d: "", i: "", s: "", c: "" };
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
    // Aceita apenas valores de 1 a 4 ou vazio
    if (value !== "" && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 4)) {
      return;
    }

    setAnswers({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        [profile]: value
      }
    });
  };

  const isQuestionComplete = (questionId) => {
    const answer = answers[questionId];
    if (!answer) return false;

    // Verifica se todos os 4 campos estão preenchidos
    return answer.d !== "" && answer.i !== "" && answer.s !== "" && answer.c !== "";
  };

  const validateAnswers = () => {
    for (let i = 1; i <= 10; i++) {
      if (!isQuestionComplete(i)) {
        toast.error(`Conjunto ${i}: Preencha todos os campos com números de 1 a 4`);
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
      let totalD = 0, totalI = 0, totalS = 0, totalC = 0;
      
      const answersArray = Object.entries(answers).map(([questionId, scores]) => {
        const d = parseInt(scores.d) || 0;
        const i = parseInt(scores.i) || 0;
        const s = parseInt(scores.s) || 0;
        const c = parseInt(scores.c) || 0;
        
        totalD += d;
        totalI += i;
        totalS += s;
        totalC += c;
        
        return {
          question_id: parseInt(questionId),
          d_score: d,
          i_score: i,
          s_score: s,
          c_score: c
        };
      });

      const total = totalD + totalI + totalS + totalC;
      const profileScores = {
        executor_d: (totalD / total) * 100,
        comunicador_i: (totalI / total) * 100,
        planejador_s: (totalS / total) * 100,
        analista_c: (totalC / total) * 100
      };

      const dominant = Object.keys(profileScores).reduce((a, b) => 
        profileScores[a] > profileScores[b] ? a : b
      );

      const recommendedRoles = getRecommendedRoles(profileScores);

      const response = await base44.functions.invoke('submitAppForms', {
        form_type: 'manager_disc_diagnostic',
        employee_id: selectedEmployee,
        workshop_id: workshop?.id || null,
        is_leader: isLeader,
        team_name: teamName || null,
        answers: answersArray,
        profile_scores: profileScores,
        dominant_profile: dominant,
        recommended_roles: recommendedRoles
      });

      if (response.data.error) throw new Error(response.data.error);

      toast.success("Teste DISC concluído!");
      navigate(createPageUrl("ResultadoDISC") + `?id=${response.data.id}`);
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
    return Object.keys(answers).filter(key => isQuestionComplete(parseInt(key))).length;
  };

  const progress = (getFilledQuestions() / 10) * 100;

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const response = await base44.functions.invoke('generateDiagnosticInvite', {
        workshop_id: workshop.id,
        employee_id: selectedEmployee || null,
        candidate_name: candidateName || null,
        diagnostic_type: 'DISC'
      });

      if (response.data.success) {
        const link = `${window.location.origin}/${response.data.path}?token=${response.data.invite_token}`;
        setInviteLink(link);
        setIsInviteModalOpen(true);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TrackingWrapper
      workshopId={workshop?.id}
      itemTipo="diagnostico"
      itemId="diagnostico_disc"
      itemNome="Teste DISC"
      itemCategoria="diagnosticos"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teste DISC - Gestor
            </h1>
            <p className="text-gray-600">
              Avaliação comportamental realizada pelo gestor ou envio de link.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => navigate(createPageUrl("HistoricoDISC"))}>
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
            <Button onClick={() => setIsInviteModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <LinkIcon className="w-4 h-4 mr-2" />
              Gerar Link
            </Button>
          </div>
        </div>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link para Autoavaliação</DialogTitle>
              <DialogDescription>
                Envie este link para o colaborador ou candidato responder o teste DISC.
              </DialogDescription>
            </DialogHeader>

            {!inviteLink ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label>Para quem é este link?</Label>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant={selectedEmployee ? "default" : "outline"} 
                      onClick={() => setCandidateName("")}
                      className="flex-1"
                    >
                      Colaborador Existente
                    </Button>
                    <Button 
                      variant={!selectedEmployee ? "default" : "outline"} 
                      onClick={() => setSelectedEmployee("")}
                      className="flex-1"
                    >
                      Candidato / Externo
                    </Button>
                  </div>
                </div>

                {selectedEmployee === "" && (
                  <div>
                    <Label>Nome do Candidato</Label>
                    <Input 
                      value={candidateName} 
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Nome completo" 
                    />
                  </div>
                )}

                {selectedEmployee !== "" && (
                  <div>
                    <Label>Selecione o Colaborador</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  onClick={handleGenerateInvite} 
                  disabled={generatingInvite || (!selectedEmployee && !candidateName)}
                  className="w-full"
                >
                  {generatingInvite ? <Loader2 className="animate-spin mr-2" /> : "Gerar Link"}
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

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="bg-white rounded-lg p-4 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progresso: {getFilledQuestions()}/10 conjuntos preenchidos
              </span>
              <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <strong>Instruções:</strong> Para cada conjunto, preencha com números de <strong>1 a 4</strong>:
                  <br />• <strong>4</strong> = Característica que MAIS se identifica
                  <br />• <strong>3</strong> = Segunda característica
                  <br />• <strong>2</strong> = Terceira característica
                  <br />• <strong>1</strong> = Característica que MENOS se identifica
                </div>
              </div>
            </CardContent>
          </Card>

          {discQuestions.map((question) => {
            const isComplete = isQuestionComplete(question.id);

            return (
              <Card key={question.id} className={`border-2 ${
                isComplete ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}>
                <CardHeader className={`${
                  isComplete ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
                  'bg-gradient-to-r from-indigo-50 to-purple-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Conjunto {question.id}</CardTitle>
                    {isComplete && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-semibold">Completo</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { key: 'd', text: question.traits.d, label: 'Opção A', color: 'red' },
                      { key: 'i', text: question.traits.i, label: 'Opção B', color: 'yellow' },
                      { key: 's', text: question.traits.s, label: 'Opção C', color: 'green' },
                      { key: 'c', text: question.traits.c, label: 'Opção D', color: 'blue' }
                    ].map((trait, index) => {
                      const bgColors = {
                        red: 'bg-red-100',
                        yellow: 'bg-yellow-100',
                        green: 'bg-green-100',
                        blue: 'bg-blue-100'
                      };
                      
                      const badgeColors = {
                        red: 'bg-red-500',
                        yellow: 'bg-yellow-500',
                        green: 'bg-green-500',
                        blue: 'bg-blue-500'
                      };

                      return (
                        <div key={index} className={`${bgColors[trait.color]} rounded-lg p-4 border-2 border-gray-300`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 ${badgeColors[trait.color]} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{trait.label}</span>
                          </div>
                          <p className="text-xs text-gray-700 mb-3 min-h-[48px] leading-tight">{trait.text}</p>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            placeholder="1-4"
                            value={answers[question.id]?.[trait.key] || ""}
                            onChange={(e) => updateAnswer(question.id, trait.key, e.target.value)}
                            className="text-center text-xl font-bold h-12"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              disabled={submitting || getFilledQuestions() < 10}
              className="bg-indigo-600 hover:bg-indigo-700 text-lg px-12 py-6 rounded-full shadow-lg"
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
    </TrackingWrapper>
  );
}