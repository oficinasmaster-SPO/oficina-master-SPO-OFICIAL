import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, MapPin, Users, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function CalendarioEventos() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    attendance_type_id: "",
    event_name: "",
    event_date: "",
    location: "",
    max_participants: null,
    description: ""
  });

  // Carregar tipos de atendimento
  const { data: attendanceTypes = [] } = useQuery({
    queryKey: ['attendance-types'],
    queryFn: () => base44.entities.AttendanceType.filter({ is_active: true })
  });

  // Carregar eventos do ano
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['event-calendar', selectedYear],
    queryFn: () => base44.entities.EventCalendar.filter({ year: selectedYear, is_active: true })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EventCalendar.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-calendar']);
      toast.success("Evento criado com sucesso!");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventCalendar.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-calendar']);
      toast.success("Evento atualizado!");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EventCalendar.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-calendar']);
      toast.success("Evento removido!");
    }
  });

  const resetForm = () => {
    setFormData({
      attendance_type_id: "",
      event_name: "",
      event_date: "",
      location: "",
      max_participants: null,
      description: ""
    });
    setEditingEvent(null);
    setDialogOpen(false);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      attendance_type_id: event.attendance_type_id,
      event_name: event.event_name,
      event_date: event.event_date.split('T')[0],
      location: event.location || "",
      max_participants: event.max_participants || null,
      description: event.description || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.attendance_type_id || !formData.event_name || !formData.event_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const attendanceType = attendanceTypes.find(t => t.id === formData.attendance_type_id);
    const eventYear = new Date(formData.event_date).getFullYear();

    const eventData = {
      attendance_type_id: formData.attendance_type_id,
      attendance_type_name: attendanceType?.name || "",
      event_name: formData.event_name,
      event_date: formData.event_date,
      year: eventYear,
      location: formData.location,
      max_participants: formData.max_participants,
      description: formData.description,
      is_active: true
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  // Agrupar eventos por mês
  const eventsByMonth = events.reduce((acc, event) => {
    const month = new Date(event.event_date).getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {});

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendário Anual de Eventos</h1>
          <p className="text-gray-600 mt-1">
            Configure as datas dos eventos anuais (imersões, treinamentos) que serão automaticamente vinculados aos contratos
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Editar Evento" : "Criar Novo Evento"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Tipo de Atendimento *</Label>
                <Select
                  value={formData.attendance_type_id}
                  onValueChange={(value) => setFormData({ ...formData, attendance_type_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nome do Evento *</Label>
                <Input
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="Ex: Imersão 1º Semestre 2026"
                />
              </div>

              <div>
                <Label>Data do Evento *</Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Local (opcional)</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: São Paulo - SP"
                />
              </div>

              <div>
                <Label>Máximo de Participantes (opcional)</Label>
                <Input
                  type="number"
                  value={formData.max_participants || ""}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Ex: 50"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes sobre o evento"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEvent ? "Atualizar" : "Criar Evento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seletor de Ano */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Ano:</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2026, 2027, 2028, 2029, 2030].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {events.length} eventos em {selectedYear}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Calendário por Mês */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((monthName, monthIndex) => {
          const monthEvents = eventsByMonth[monthIndex] || [];
          
          return (
            <Card key={monthIndex} className={monthEvents.length > 0 ? "border-l-4 border-l-blue-500" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{monthName}</span>
                  {monthEvents.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-800">{monthEvents.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum evento</p>
                ) : (
                  <div className="space-y-3">
                    {monthEvents
                      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                      .map((event) => (
                        <div key={event.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.event_name}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(event.event_date).toLocaleDateString('pt-BR')}
                              </div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {event.attendance_type_name}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(event)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Remover evento "${event.event_name}"?`)) {
                                    deleteMutation.mutate(event.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                          {event.max_participants && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Users className="w-3 h-3" />
                              Máx: {event.max_participants} participantes
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}