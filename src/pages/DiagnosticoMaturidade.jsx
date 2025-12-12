import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, User, Link as LinkIcon, History, Copy, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { maturityQuestions, answerMapping } from "../components/maturity/MaturityQuestions";
import { toast } from "sonner";
import TrackingWrapper from "@/components/shared/TrackingWrapper";

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
      
      const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      const userWorkshop = ownedWorkshops && ownedWorkshops.length > 0 ? ownedWorkshops[0] : null;
      setWorkshop(userWorkshop);

      let activeEmployees = [];
      if (userWorkshop) {
        activeEmployees = await base44.entities.Employee.filter({ 
          workshop_id: userWorkshop.id, 
          status: "ativo" 
        });
      } else {
         // Fallback se não tiver oficina, tenta pegar todos (comportamento antigo, mas filtrado por status)
         // Idealmente deveria redirecionar, mas vamos manter a lógica defensiva
         const all = await base44.entities.Employee.list();
         activeEmployees = all.filter(e => e.status === "ativo");
      }
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

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const response = await base44.functions.invoke('generateDiagnosticInvite', {
        workshop_id: workshop.id,
        employee_id: selectedEmployee || null,
        candidate_name: candidateName || null,
        diagnostic_type: 'MATURITY'
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
        evaluation_type: 'manager',
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
    <TrackingWrapper
      workshopId={workshop?.id}
      itemTipo="diagnostico"
      itemId="diagnostico_maturidade"
      itemNome="Diagnóstico de Maturidade Profissional"
      itemCategoria="diagnosticos"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Maturidade Profissional - Gestor
              </h1>
              {workshop && (
                <p className="text-sm text-gray-600 mt-1">
                  {workshop.name}
                </p>
              )}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={() => navigate(createPageUrl("HistoricoMaturidade"))}>
                <History className="w-4 h-4 mr-2" />
                Histórico
              </Button>
              <Button onClick={() => setIsInviteModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <LinkIcon className="w-4 h-4 mr-2" />
                Gerar Link
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Pergunta {currentQuestion + 1} de {maturityQuestions.length}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Link para Autoavaliação</DialogTitle>
                <DialogDescription>
                  Envie este link para o colaborador ou candidato.
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
    </TrackingWrapper>
  );
}