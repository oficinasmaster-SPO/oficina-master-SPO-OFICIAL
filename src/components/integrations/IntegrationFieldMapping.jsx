import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map, Plus, Trash2, ArrowRight } from "lucide-react";

export default function IntegrationFieldMapping({ integration, mapping, onChange }) {
  const [mappings, setMappings] = useState(mapping || []);

  const systemFields = [
    { id: "workshop_id", label: "ID Oficina", type: "text" },
    { id: "consultor_id", label: "ID Consultor", type: "text" },
    { id: "consultor_nome", label: "Nome Consultor", type: "text" },
    { id: "data_agendada", label: "Data Agendada", type: "datetime" },
    { id: "duracao_minutos", label: "Duração (min)", type: "number" },
    { id: "tipo_atendimento", label: "Tipo Atendimento", type: "text" },
    { id: "status", label: "Status", type: "text" },
    { id: "observacoes", label: "Observações", type: "text" },
  ];

  const externalFields = {
    google_calendar: [
      { id: "summary", label: "Título do Evento" },
      { id: "description", label: "Descrição" },
      { id: "start", label: "Data/Hora Início" },
      { id: "end", label: "Data/Hora Fim" },
      { id: "location", label: "Localização" },
      { id: "attendees", label: "Participantes" },
      { id: "creator", label: "Criador" },
    ],
    google_meet: [
      { id: "meetingCode", label: "Código da Reunião" },
      { id: "meetingUrl", label: "URL da Reunião" },
      { id: "transcript", label: "Transcrição" },
      { id: "duration", label: "Duração" },
    ],
  };

  const currentExternalFields = externalFields[integration?.id] || [];

  const addMapping = () => {
    const newMapping = {
      id: Date.now().toString(),
      systemField: "",
      externalField: "",
      direction: "import",
    };
    const updated = [...mappings, newMapping];
    setMappings(updated);
    onChange(updated);
  };

  const removeMapping = (id) => {
    const updated = mappings.filter((m) => m.id !== id);
    setMappings(updated);
    onChange(updated);
  };

  const updateMapping = (id, field, value) => {
    const updated = mappings.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    setMappings(updated);
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Mapeamento de Campos
            </CardTitle>
            <CardDescription>
              Defina como os campos são mapeados entre os sistemas
            </CardDescription>
          </div>
          <Button onClick={addMapping} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Mapeamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Map className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum mapeamento configurado</p>
              <p className="text-sm mt-1">
                Clique em "Adicionar Mapeamento" para começar
              </p>
            </div>
          ) : (
            mappings.map((map) => (
              <div
                key={map.id}
                className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50"
              >
                <div className="flex-1">
                  <Select
                    value={map.systemField}
                    onValueChange={(value) =>
                      updateMapping(map.id, "systemField", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Campo do Sistema..." />
                    </SelectTrigger>
                    <SelectContent>
                      {systemFields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Badge variant="outline">
                    {map.direction === "import" ? "Importar" : "Exportar"}
                  </Badge>
                </div>

                <div className="flex-1">
                  <Select
                    value={map.externalField}
                    onValueChange={(value) =>
                      updateMapping(map.id, "externalField", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Campo Externo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {currentExternalFields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMapping(map.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}