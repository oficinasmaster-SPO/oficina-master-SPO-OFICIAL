import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Video } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ConflitosHorarioModal from "./ConflitosHorarioModal";

export default function RegistrarAtendimentoFormMass({ formData, onFormChange, onClose, user, onSaveAndContinue }) {
  const [consultorSelecionado, setConsultorSelecionado] = useState(user?.id || "");
  const [conflitosModal, setConflitosModal] = useState({ open: false, conflitos: [], dataHorario: null });

  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-massa'],
    queryFn: async () => {
      try {
        const employees = await base44.entities.Employee.list();
        return employees.filter(e => e.job_role === 'acelerador' || e.job_role === 'consultor');
      } catch {
        return [];
      }
    }
  });

  const handleChange = (field, value) => {
    onFormChange({ ...formData, [field]: value });
  };

  const verificarConflitos = async () => {
    if (!formData.data_agendada || !formData.hora_agendada || !consultorSelecionado) {
      toast.error("Preencha data, horário e consultor para verificar conflitos");
      return false;
    }

    try {
      const dataHoraCompleta = `${formData.data_agendada}T${formData.hora_agendada}:00`;
      const response = await base44.functions.invoke('verificarConflitoHorario', {
        consultor_id: consultorSelecionado,
        data_agendada: dataHoraCompleta
      });

      if (response.data.conflito) {
        setConflitosModal({
          open: true,
          conflitos: response.data.atendimentos,
          dataHorario: dataHoraCompleta
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      toast.error("Erro ao verificar conflitos de horário");
      return false;
    }
  };

  const generateMeetLink = () => {
    const randomId = Math.random().toString(36).substring(7);
    handleChange("google_meet_link", `https://meet.google.com/${randomId}`);
    toast.success("Link Google Meet gerado!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h3 className="text-lg font-semibold flex-1">Novo Atendimento</h3>
      </div>

      <Tabs defaultValue="basico" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basico">Dados Básicos</TabsTrigger>
          <TabsTrigger value="reuniao">Reunião</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="basico" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Consultor *</Label>
              <Select value={consultorSelecionado} onValueChange={setConsultorSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.id}>{user?.full_name}</SelectItem>
                  {consultores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável pelo Lote *</Label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm">
                {user?.full_name || "Não definido"}
              </div>
            </div>
          </div>

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
        </TabsContent>

        <TabsContent value="reuniao" className="space-y-4">
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
              rows={4}
            />
          </div>

          <div>
            <Label>Objetivos</Label>
            <Textarea
              placeholder="Objetivos do atendimento..."
              value={formData.objetivos}
              onChange={(e) => handleChange("objetivos", e.target.value)}
              rows={4}
            />
          </div>
        </TabsContent>

        <TabsContent value="detalhes" className="space-y-4">
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Notas gerais..."
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={6}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
            <p className="font-semibold mb-2">Informações do Atendimento</p>
            <ul className="space-y-1 text-xs">
              <li>• Consultor: <strong>{user?.full_name}</strong></li>
              <li>• Tipo: <strong>{formData.tipo_atendimento?.replace(/_/g, " ")}</strong></li>
              <li>• Data/Hora: <strong>{formData.data_agendada} {formData.hora_agendada}</strong></li>
              <li>• Status: <strong>{formData.status}</strong></li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={async () => {
            if (!formData.data_agendada || !formData.hora_agendada) {
              toast.error("Preencha data e horário obrigatórios");
              return;
            }
            const semConflito = await verificarConflitos();
            if (semConflito) {
              onSaveAndContinue();
            }
          }} 
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Salvar e Continuar
        </Button>
      </div>

      <ConflitosHorarioModal
        open={conflitosModal.open}
        onOpenChange={(open) => setConflitosModal({ ...conflitosModal, open })}
        conflitos={conflitosModal.conflitos}
        dataHorario={conflitosModal.dataHorario}
      />
    </div>
  );
}