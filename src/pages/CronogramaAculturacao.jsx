import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CronogramaAculturacao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [workshop, setWorkshop] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    type: "ritual",
    scheduled_date: ""
  });

  const handleCreateActivity = async () => {
    if (!newActivity.title || !newActivity.scheduled_date) {
      toast.error("Preencha título e data");
      return;
    }

    try {
      await base44.entities.AcculturationActivity.create({
        workshop_id: workshop.id,
        ...newActivity,
        status: "pendente",
        auto_generated: false
      });
      toast.success("Atividade criada!");
      setIsCreateModalOpen(false);
      setNewActivity({ title: "", description: "", type: "ritual", scheduled_date: "" });
      loadData();
    } catch (error) {
      toast.error("Erro ao criar atividade");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);

      if (!userWorkshop) {
        setActivities([]);
        return;
      }

      // Buscar ScheduledRitual (rituais agendados)
      const scheduledRituals = await base44.entities.ScheduledRitual.filter({ 
        workshop_id: userWorkshop.id 
      });

      // Buscar AcculturationActivity (outras atividades)
      const acculturationActivities = await base44.entities.AcculturationActivity.filter({ 
        workshop_id: userWorkshop.id 
      });

      // Converter ScheduledRitual para formato de atividade
      const ritualActivities = scheduledRituals.map(ritual => ({
        id: ritual.id,
        workshop_id: ritual.workshop_id,
        title: ritual.ritual_name,
        description: ritual.notes || '',
        type: 'ritual',
        scheduled_date: ritual.scheduled_date,
        status: ritual.status === 'concluido' ? 'concluida' : ritual.status === 'realizado' ? 'em_andamento' : 'pendente',
        auto_generated: false,
        source: 'ritual' // Marca a origem
      }));

      // Combinar e ordenar por data
      const allActivities = [...ritualActivities, ...acculturationActivities]
        .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

      setActivities(allActivities);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (activityId, newStatus) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      
      if (activity?.source === 'ritual') {
        // Atualizar ScheduledRitual
        const ritualStatus = newStatus === 'concluida' ? 'concluido' : 
                            newStatus === 'em_andamento' ? 'realizado' : 'agendado';
        await base44.entities.ScheduledRitual.update(activityId, { status: ritualStatus });
      } else {
        // Atualizar AcculturationActivity
        const updateData = { status: newStatus };
        if (newStatus === "concluida") {
          updateData.completion_date = new Date().toISOString();
        }
        await base44.entities.AcculturationActivity.update(activityId, updateData);
      }
      
      toast.success("Status atualizado!");
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pendente: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pendente" },
      em_andamento: { color: "bg-blue-100 text-blue-800", icon: AlertCircle, label: "Em Andamento" },
      concluida: { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Concluída" },
      cancelada: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, label: "Cancelada" }
    };
    
    const variant = variants[status] || variants.pendente;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const labels = {
      onboarding: "Onboarding",
      treinamento: "Treinamento",
      ritual: "Ritual",
      avaliacao: "Avaliação",
      feedback: "Feedback"
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const groupedActivities = {
    pendentes: activities.filter(a => a.status === "pendente"),
    em_andamento: activities.filter(a => a.status === "em_andamento"),
    concluidas: activities.filter(a => a.status === "concluida")
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Cronograma de Aculturamento
          </h1>
          <p className="text-gray-600">Acompanhe as atividades programadas de cultura organizacional</p>
          
          <div className="mt-6">
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Atividade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Atividade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Título</Label>
                    <Input 
                      value={newActivity.title}
                      onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                      placeholder="Ex: Reunião de Alinhamento"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select 
                      value={newActivity.type} 
                      onValueChange={(val) => setNewActivity({...newActivity, type: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ritual">Ritual</SelectItem>
                        <SelectItem value="treinamento">Treinamento</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="avaliacao">Avaliação</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data Agendada</Label>
                    <Input 
                      type="date"
                      value={newActivity.scheduled_date}
                      onChange={(e) => setNewActivity({...newActivity, scheduled_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea 
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                      placeholder="Detalhes da atividade..."
                    />
                  </div>
                  <Button onClick={handleCreateActivity} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{groupedActivities.pendentes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{groupedActivities.em_andamento.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{groupedActivities.concluidas.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Nenhuma atividade programada</p>
                <Button onClick={() => navigate(createPageUrl("CulturaOrganizacional"))}>
                  Configurar Manual da Cultura
                </Button>
              </CardContent>
            </Card>
          ) : (
            activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{activity.title}</h3>
                        {activity.auto_generated && (
                          <Badge variant="secondary" className="text-xs">Auto-gerada</Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{activity.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {getStatusBadge(activity.status)}
                        {getTypeBadge(activity.type)}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(activity.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </Badge>
                      </div>
                      
                      {activity.notes && (
                        <p className="text-sm text-gray-500 mt-3 italic">{activity.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {activity.status === "pendente" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(activity.id, "em_andamento")}
                        >
                          Iniciar
                        </Button>
                      )}
                      {activity.status === "em_andamento" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange(activity.id, "concluida")}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}