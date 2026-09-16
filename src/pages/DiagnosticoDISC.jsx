import React, { useState, useEffect } from "react";
// FORCE FULL REBUILD: 2026-04-11 14:15
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DISCAvaliacaoModal from "@/components/disc/DISCAvaliacaoModal";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { Loader2, Brain, Link as LinkIcon, History, Copy, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { discQuestions } from "@/components/disc/DISCQuestions";
// HMR force update
import { toast } from "sonner";
import TrackingWrapper from "@/components/shared/TrackingWrapper";
import EvaluationGate from "@/components/evaluations/EvaluationGate";
import { useEvaluationPermissions } from "@/components/hooks/useEvaluationPermissions";
import ResultadoDISCModal from "@/pages/ResultadoDISC";

export default function DiagnosticoDISC() {
  const navigate = useNavigate();
  const { workshop, isLoading: isWorkshopLoading } = useWorkshopContext();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  const [searchParams] = useSearchParams();
  const [selectedEmployee, setSelectedEmployee] = useState(searchParams.get('employee_id') || searchParams.get('employeeId') || "");
  const [isLeader, setIsLeader] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultDiagnosticId, setResultDiagnosticId] = useState(null);

  const { canEvaluate, isLeader: hasLeaderPerms, currentUserEmployee } = useEvaluationPermissions();

  useEffect(() => {
    if (!isWorkshopLoading) {
      loadData();
    }
  }, [isWorkshopLoading, workshop, searchParams]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const urlWorkshopId = searchParams.get('workshop_id');
      const finalWorkshopId = urlWorkshopId || workshop?.id;
      
      let activeEmployees = [];
      if (finalWorkshopId) {
        try {
          activeEmployees = await base44.entities.Employee.filter({
            workshop_id: finalWorkshopId,
            status: "ativo"
          });
        } catch (err) {
          console.error("Erro ao buscar colaboradores da oficina", err);
        }
      } else {
        const allEmployees = await base44.entities.Employee.list();
        activeEmployees = allEmployees.filter(e => e.status === "ativo");
      }
      setEmployees(activeEmployees);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoDISC"));
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = () => {
    if (!selectedEmployee) {
      toast.error("Selecione o colaborador a ser avaliado");
      return;
    }

    if (!canEvaluate(selectedEmployee)) {
      toast.error("Acesso negado: Você não tem permissão para avaliar este colaborador.");
      return;
    }

    setIsAssessmentOpen(true);
  };

  // Sprint 4: avaliação roda em modal de perguntas individuais; o envio continua
  // unificado no backend (padrão 1 = mais parecido, conversão/cálculo/e-mail no servidor)
  const submitAssessment = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const urlWorkshopId = searchParams.get('workshop_id');
      const finalWorkshopId = urlWorkshopId || workshop?.id;

      const response = await base44.functions.invoke('submeterDiagnosticoDISC', {
        employee_id: selectedEmployee,
        workshop_id: finalWorkshopId || null,
        evaluation_type: (currentUserEmployee && currentUserEmployee.id === selectedEmployee) ? 'self' : 'manager',
        is_leader: isLeader,
        team_name: teamName || null,
        answers: finalAnswers
      });

      if (response.data.error) throw new Error(response.data.error);

      toast.success("Teste DISC concluído!");
      setResultDiagnosticId(response.data.id);
      setResultModalOpen(true);
      setIsAssessmentOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInvite = async () => {
    const urlWorkshopId = searchParams.get('workshop_id');
    const finalWorkshopId = urlWorkshopId || workshop?.id;

    if (!finalWorkshopId) {
      toast.error("Oficina não identificada. Por favor, acesse novamente pela página da oficina.");
      return;
    }
    
    setGeneratingInvite(true);
    try {
      const uuid = crypto.randomUUID();
      await base44.entities.DISCPublicSession.create({
        workshop_id: finalWorkshopId,
        employee_id: selectedEmployee || null,
        candidate_name: candidateName || null,
        session_type: selectedEmployee ? "colaborador_interno" : "candidato_externo",
        token: uuid,
        status: 'pendente',
        created_at: new Date().toISOString()
      });
      
      const link = `${window.location.origin}/PublicDISC?token=${uuid}`;
      setInviteLink(link);
      setIsInviteModalOpen(true);
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

  if (loading || isWorkshopLoading) {
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
              Teste DISC Comportamental
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
            <Button onClick={handleGenerateInvite} disabled={generatingInvite} className="bg-indigo-600 hover:bg-indigo-700">
              {generatingInvite ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Gerar Link Rápido
            </Button>
            <Button onClick={() => setIsInviteModalOpen(true)} variant="secondary">
              Convite Específico
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

        <div className="space-y-6">
          <Card className="border-2 border-indigo-200">
            <CardHeader>
              <CardTitle>Dados do Avaliado</CardTitle>
              <CardDescription>Selecione o colaborador e defina se é líder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="md:col-span-2">
                  <EvaluationGate 
                    employees={employees || []}
                    selectedEmployee={selectedEmployee} 
                    onSelectEmployee={setSelectedEmployee} 
                  />
                </div>
                
                {hasLeaderPerms && (
                  <>
                    <div className="mt-4">
                      <Label>Nome da Equipe (opcional)</Label>
                      <Input
                        placeholder="Ex: Equipe de Vendas"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-2 mt-4">
                      <Checkbox
                        id="is-leader"
                        checked={isLeader}
                        onCheckedChange={setIsLeader}
                      />
                      <Label htmlFor="is-leader" className="font-normal cursor-pointer">
                        Este colaborador é líder de equipe
                      </Label>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-200">
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Avaliação DISC</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  {discQuestions.length} perguntas exibidas uma por vez em um modal. Em cada pergunta, ordene as características de 1 (mais parecido com o colaborador) a 4 (menos parecido).
                </p>
              </div>
              <Button
                onClick={handleStartAssessment}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-lg px-10 py-6 rounded-full shadow-lg"
              >
                {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                Iniciar Avaliação
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    <DISCAvaliacaoModal
        open={isAssessmentOpen}
        onOpenChange={setIsAssessmentOpen}
        employeeName={employees.find(e => e.id === selectedEmployee)?.full_name}
        submitting={submitting}
        onComplete={submitAssessment}
      />
    <ResultadoDISCModal
        open={resultModalOpen}
        onOpenChange={setResultModalOpen}
        diagnosticId={resultDiagnosticId}
      />
    </TrackingWrapper>
  );
}