import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CheckCircle2, Clock, AlertCircle, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, isWithinInterval, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import TimelineView from "@/components/cronograma/TimelineView";
import CompletionModal from "@/components/cronograma/CompletionModal";
import ActivityFilters from "@/components/cronograma/ActivityFilters";
import ActivityDetailsModal from "@/components/cronograma/ActivityDetailsModal";
import PillarDashboard from "@/components/cultura/PillarDashboard";
import PillarManager from "@/components/cultura/PillarManager";

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
  const [filters, setFilters] = useState({
    period: 'all',
    status: 'all',
    type: 'all',
    search: ''
  });
  const [selectedForCompletion, setSelectedForCompletion] = useState(null);
  const [selectedForDetails, setSelectedForDetails] = useState(null);
  const [culturalPillars, setCulturalPillars] = useState([]);
  const [showPillarManager, setShowPillarManager] = useState(false);

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
        setCulturalPillars([]);
        return;
      }

      const [scheduledRituals, acculturationActivities, pillars] = await Promise.all([
        base44.entities.ScheduledRitual.filter({ workshop_id: userWorkshop.id }),
        base44.entities.AcculturationActivity.filter({ workshop_id: userWorkshop.id }),
        base44.entities.CulturalPillar.filter({ workshop_id: userWorkshop.id })
      ]);

      setCulturalPillars(pillars || []);

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
    const activity = activities.find(a => a.id === activityId);
    
    if (newStatus === "concluida") {
      // Abrir modal de conclusão
      setSelectedForCompletion(activity);
    } else {
      // Atualização simples de status
      try {
        if (activity?.source === 'ritual') {
          const ritualStatus = newStatus === 'em_andamento' ? 'realizado' : 'agendado';
          await base44.entities.ScheduledRitual.update(activityId, { status: ritualStatus });
        } else {
          await base44.entities.AcculturationActivity.update(activityId, { status: newStatus });
        }
        toast.success("Status atualizado!");
        loadData();
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        toast.error("Erro ao atualizar status");
      }
    }
  };

  const handleCompleteActivity = async (activityId, completionData, source) => {
    try {
      if (source === 'ritual') {
        await base44.entities.ScheduledRitual.update(activityId, {
          status: 'concluido',
          ...completionData
        });
      } else {
        await base44.entities.AcculturationActivity.update(activityId, completionData);
      }
      loadData();
    } catch (error) {
      throw error;
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

  // Filtrar atividades
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Filtro de busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!activity.title?.toLowerCase().includes(searchLower) &&
            !activity.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro de status
      if (filters.status !== 'all' && activity.status !== filters.status) {
        return false;
      }

      // Filtro de tipo
      if (filters.type !== 'all' && activity.type !== filters.type) {
        return false;
      }

      // Filtro de período
      const activityDate = new Date(activity.scheduled_date);
      const today = new Date();
      
      switch (filters.period) {
        case 'today':
          return isToday(activityDate);
        case 'week':
          return isWithinInterval(activityDate, { start: subDays(today, 7), end: today });
        case 'month':
          return isWithinInterval(activityDate, { start: subDays(today, 30), end: today });
        case 'quarter':
          return isWithinInterval(activityDate, { start: subDays(today, 90), end: today });
        case 'overdue':
          return isPast(activityDate) && !isToday(activityDate) && activity.status === 'pendente';
        case 'upcoming':
          return activityDate > today;
        default:
          return true;
      }
    });
  }, [activities, filters]);

  const stats = useMemo(() => ({
    total: filteredActivities.length,
    pendentes: filteredActivities.filter(a => a.status === "pendente").length,
    em_andamento: filteredActivities.filter(a => a.status === "em_andamento").length,
    concluidas: filteredActivities.filter(a => a.status === "concluida").length,
    atrasadas: filteredActivities.filter(a => 
      isPast(new Date(a.scheduled_date)) && 
      !isToday(new Date(a.scheduled_date)) && 
      a.status === 'pendente'
    ).length,
    completionRate: filteredActivities.length > 0 
      ? Math.round((filteredActivities.filter(a => a.status === "concluida").length / filteredActivities.length) * 100)
      : 0
  }), [filteredActivities]);

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

        {/* Gestão de Pilares */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pilares Culturais</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPillarManager(!showPillarManager)}
                >
                  {showPillarManager ? "Ver Dashboard" : "Gerenciar Pilares"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPillarManager ? (
                <PillarManager
                  pillars={culturalPillars}
                  workshopId={workshop?.id}
                  onUpdate={loadData}
                />
              ) : (
                <PillarDashboard
                  pillars={culturalPillars}
                  activities={activities}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-sm text-gray-600 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.pendentes}</div>
                <p className="text-sm text-gray-600 mt-1">Pendentes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.em_andamento}</div>
                <p className="text-sm text-gray-600 mt-1">Em Andamento</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.concluidas}</div>
                <p className="text-sm text-gray-600 mt-1">Concluídas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="text-3xl font-bold text-indigo-600">{stats.completionRate}%</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Taxa Conclusão</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <ActivityFilters 
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={() => setFilters({ period: 'all', status: 'all', type: 'all', search: '' })}
        />

        {/* Timeline de Atividades */}
        <div className="mt-8">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Nenhuma atividade programada</p>
                <Button onClick={() => navigate(createPageUrl("RituaisAculturamento"))}>
                  Agendar Rituais
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TimelineView 
              activities={filteredActivities}
              onStatusChange={handleStatusChange}
              onViewDetails={setSelectedForDetails}
            />
          )}
        </div>

        {/* Modais */}
        <CompletionModal
          activity={selectedForCompletion}
          onClose={() => setSelectedForCompletion(null)}
          onComplete={handleCompleteActivity}
        />

        <ActivityDetailsModal
          activity={selectedForDetails}
          onClose={() => setSelectedForDetails(null)}
        />
      </div>
    </div>
  );
}