import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { toast } from "sonner";

export default function MassAtaForm({ formData, onFormChange }) {
  const handleChange = (field, value) => {
    onFormChange({ ...formData, [field]: value });
  };

  const generateMeetLink = () => {
    const randomId = Math.random().toString(36).substring(7);
    handleChange("google_meet_link", `https://meet.google.com/${randomId}`);
    toast.success("Link Google Meet gerado!");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Atendimento *</Label>
          <Select value={formData.tipo_atendimento} onValueChange={(v) => handleChange("tipo_atendimento", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diagnostico_inicial">Diagnóstico Inicial</SelectItem>
              <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal</SelectItem>
              <SelectItem value="reuniao_estrategica">Reunião Estratégica</SelectItem>
              <SelectItem value="treinamento">Treinamento</SelectItem>
              <SelectItem value="auditoria">Auditoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status *</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Data *</Label>
          <Input
            type="date"
            value={formData.data_agendada}
            onChange={(e) => handleChange("data_agendada", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Horário *</Label>
          <Input
            type="time"
            value={formData.hora_agendada}
            onChange={(e) => handleChange("hora_agendada", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Duração (min)</Label>
          <Input
            type="number"
            value={formData.duracao_minutos}
            onChange={(e) => handleChange("duracao_minutos", parseInt(e.target.value))}
            min="15"
            step="15"
          />
        </div>
      </div>

      <div>
        <Label>Google Meet</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Link do Google Meet"
            value={formData.google_meet_link}
            onChange={(e) => handleChange("google_meet_link", e.target.value)}
          />
          <Button type="button" variant="outline" onClick={generateMeetLink}>
            <Video className="w-4 h-4 mr-2" />
            Gerar
          </Button>
        </div>
      </div>

      <div>
        <Label>Pauta da Reunião</Label>
        <Textarea
          placeholder="Tópicos a serem discutidos..."
          value={formData.pauta}
          onChange={(e) => handleChange("pauta", e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label>Objetivos</Label>
        <Textarea
          placeholder="Objetivos do atendimento..."
          value={formData.objetivos}
          onChange={(e) => handleChange("objetivos", e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea
          placeholder="Notas gerais..."
          value={formData.observacoes}
          onChange={(e) => handleChange("observacoes", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}