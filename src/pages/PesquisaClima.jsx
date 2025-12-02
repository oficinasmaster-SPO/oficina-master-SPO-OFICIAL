import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, TrendingUp, Send, Users, Mail, RefreshCw, History, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function PesquisaClima() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newSurveyDialogOpen, setNewSurveyDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);

      if (userWorkshop) {
        // Load employees
        const emps = await base44.entities.Employee.filter({ workshop_id: userWorkshop.id, status: 'ativo' });
        setEmployees(emps);
        setSelectedEmployees(emps.map(e => e.id)); // Select all by default

        // Load surveys history
        const s = await base44.entities.CompanyClimate.filter({ workshop_id: userWorkshop.id }, '-reference_date');
        setSurveys(s);

        // Load invites for active surveys
        if (s.length > 0) {
          const inv = await base44.entities.ClimateSurveyInvite.filter({ workshop_id: userWorkshop.id });
          setInvites(inv);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndSend = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Selecione ao menos um colaborador");
      return;
    }

    setSending(true);
    try {
      // 1. Create Survey Cycle
      const survey = await base44.entities.CompanyClimate.create({
        workshop_id: workshop.id,
        reference_date: new Date().toISOString().split('T')[0],
        status: 'aberta',
        overall_score: 0,
        dimensions: {},
        employee_responses: [],
        participation_rate: 0
      });

      // 2. Call backend to generate unique links and send emails
      const participants = employees.filter(e => selectedEmployees.includes(e.id)).map(e => ({
        id: e.id,
        name: e.full_name,
        email: e.email
      }));

      await base44.functions.invoke("sendClimateInvites", {
        survey_id: survey.id,
        employees: participants,
        origin: window.location.origin
      });

      toast.success("Pesquisa criada e convites enviados!");
      setNewSurveyDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar convites");
    } finally {
      setSending(false);
    }
  };

  const getParticipationStats = (surveyId) => {
    const surveyInvites = invites.filter(i => i.survey_id === surveyId);
    const total = surveyInvites.length;
    const responded = surveyInvites.filter(i => i.status === 'respondido').length;
    const rate = total > 0 ? Math.round((responded / total) * 100) : 0;
    return { total, responded, rate };
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              Pesquisa de Clima
            </h1>
            <p className="text-gray-600">Gerencie os ciclos de pesquisa e acompanhe a participação</p>
          </div>
          <Dialog open={newSurveyDialogOpen} onOpenChange={setNewSurveyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" /> Nova Pesquisa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Iniciar Novo Ciclo de Pesquisa</DialogTitle>
                <DialogDescription>
                  Selecione os colaboradores que receberão o link da pesquisa.
                  O link é único para cada um (para controle de quem respondeu), mas as respostas são anônimas.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Colaboradores ({selectedEmployees.length})</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (selectedEmployees.length === employees.length) setSelectedEmployees([]);
                      else setSelectedEmployees(employees.map(e => e.id));
                    }}
                  >
                    {selectedEmployees.length === employees.length ? "Desmarcar Todos" : "Marcar Todos"}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox 
                        id={emp.id} 
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                          else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                        }}
                      />
                      <div className="flex-1">
                        <label htmlFor={emp.id} className="text-sm font-medium cursor-pointer block">{emp.full_name}</label>
                        <span className="text-xs text-gray-500">{emp.email || "Sem e-mail"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleCreateAndSend} 
                disabled={sending || selectedEmployees.length === 0} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Criar Pesquisa e Enviar Convites
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {surveys.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Nenhuma pesquisa realizada</h3>
                <p className="text-gray-500 mt-2">Inicie o primeiro ciclo de pesquisa de clima agora.</p>
              </CardContent>
            </Card>
          ) : (
            surveys.map(survey => {
              const stats = getParticipationStats(survey.id);
              return (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Ciclo de {format(new Date(survey.reference_date), 'dd/MM/yyyy')}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${survey.status === 'aberta' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {survey.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('ResultadoClima') + `?id=${survey.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver Resultados
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Participação</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.rate}%</p>
                        <p className="text-xs text-gray-500">{stats.responded} de {stats.total} convidados</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Respostas Recebidas</p>
                        <p className="text-2xl font-bold text-blue-600">{survey.employee_responses?.length || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Tracking (Quem Falta)</p>
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${stats.rate}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lista de quem falta responder (Tracking Pix) */}
                    <div className="mt-4">
                      <details className="text-sm text-gray-500 cursor-pointer">
                        <summary>Ver status dos convites (Tracking)</summary>
                        <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 bg-white">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b">
                                <th className="pb-1 font-medium">Colaborador</th>
                                <th className="pb-1 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invites.filter(i => i.survey_id === survey.id).map(invite => (
                                <tr key={invite.id} className="border-b last:border-0">
                                  <td className="py-1">{invite.employee_name}</td>
                                  <td className="py-1">
                                    {invite.status === 'respondido' ? (
                                      <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Respondido</span>
                                    ) : (
                                      <span className="text-orange-500 flex items-center gap-1"><History className="w-3 h-3" /> Pendente</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}