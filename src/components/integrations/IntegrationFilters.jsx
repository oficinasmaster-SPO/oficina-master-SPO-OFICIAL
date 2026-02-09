import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Filter, Plus, X } from "lucide-react";

export default function IntegrationFilters({ integration, filters, onChange }) {
  const eventTypes = {
    google_calendar: [
      { id: "meeting", label: "Reuniões/Consultorias" },
      { id: "deadline", label: "Prazos e Deadlines" },
      { id: "reminder", label: "Lembretes" },
      { id: "all_day", label: "Eventos de dia inteiro" },
    ],
    google_meet: [
      { id: "scheduled", label: "Reuniões Agendadas" },
      { id: "instant", label: "Reuniões Instantâneas" },
      { id: "recurring", label: "Reuniões Recorrentes" },
    ],
  };

  const currentEventTypes = eventTypes[integration?.id] || [];

  const toggleEventType = (typeId) => {
    const current = filters.eventTypes || [];
    const updated = current.includes(typeId)
      ? current.filter((id) => id !== typeId)
      : [...current, typeId];
    onChange({ ...filters, eventTypes: updated });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Sincronização
          </CardTitle>
          <CardDescription>
            Defina quais dados devem ser sincronizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipos de Eventos */}
          {currentEventTypes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base">Tipos de Eventos</Label>
              <div className="space-y-2">
                {currentEventTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-2">
                    <Checkbox
                      id={type.id}
                      checked={(filters.eventTypes || []).includes(type.id)}
                      onCheckedChange={() => toggleEventType(type.id)}
                    />
                    <Label htmlFor={type.id} className="font-normal cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Período de Sincronização */}
          <div className="space-y-2">
            <Label className="text-base">Período de Sincronização</Label>
            <Select
              value={filters.dateRange || "all"}
              onValueChange={(value) =>
                onChange({ ...filters, dateRange: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="future">Apenas eventos futuros</SelectItem>
                <SelectItem value="7days">Próximos 7 dias</SelectItem>
                <SelectItem value="30days">Próximos 30 dias</SelectItem>
                <SelectItem value="90days">Próximos 90 dias</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros por Consultor */}
          <div className="space-y-2">
            <Label className="text-base">Filtrar por Consultor/Mentor</Label>
            <p className="text-sm text-gray-600">
              Sincronizar apenas eventos de consultores específicos
            </p>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar consultor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os consultores</SelectItem>
                  <SelectItem value="consultor1">Consultor 1</SelectItem>
                  <SelectItem value="consultor2">Consultor 2</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status de Atendimento */}
          <div className="space-y-2">
            <Label className="text-base">Status de Atendimento</Label>
            <div className="space-y-2">
              {["agendado", "confirmado", "realizado", "cancelado"].map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox id={status} defaultChecked />
                  <Label htmlFor={status} className="font-normal cursor-pointer capitalize">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}