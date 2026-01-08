import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ReagendarAtendimentoModal({ atendimento, workshop, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [motivoReagendamento, setMotivoReagendamento] = useState("");

  const handleReagendar = async () => {
    if (!novaData || !novoHorario) {
      toast.error("Preencha nova data e horário");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      const novaDataHora = `${novaData}T${novoHorario}:00`;

      // Atualizar atendimento com novo status e data
      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
        data_agendada: novaDataHora,
        status: 'reagendado',
        motivo_reagendamento: motivoReagendamento
      });

      // Criar ata de reagendamento
      const ataCount = await base44.entities.MeetingMinutes.list();
      const code = `IT.${String(ataCount.length + 1).padStart(4, '0')}`;

      await base44.entities.MeetingMinutes.create({
        code,
        workshop_id: workshop.id,
        atendimento_id: atendimento.id,
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_time: new Date().toTimeString().slice(0, 5),
        tipo_aceleracao: 'reagendamento',
        consultor_name: user.full_name,
        consultor_id: user.id,
        participantes: [],
        responsavel: { name: workshop.name, role: "Cliente" },
        pautas: `Reagendamento de atendimento`,
        objetivos_atendimento: `Atendimento reagendado de ${new Date(atendimento.data_agendada).toLocaleString('pt-BR')} para ${new Date(novaDataHora).toLocaleString('pt-BR')}`,
        objetivos_consultor: motivoReagendamento || "Reagendamento conforme necessidade",
        proximos_passos: [{
          descricao: `Realizar atendimento na nova data: ${new Date(novaDataHora).toLocaleString('pt-BR')}`,
          responsavel: user.full_name,
          prazo: novaData
        }],
        visao_geral_projeto: `Histórico: Atendimento original agendado para ${new Date(atendimento.data_agendada).toLocaleString('pt-BR')} foi reagendado.`,
        status: 'finalizada'
      });

      toast.success("Atendimento reagendado com sucesso!");
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao reagendar:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reagendar Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Cliente:</strong> {workshop?.name}
            </p>
            <p className="text-sm text-blue-900">
              <strong>Data Atual:</strong> {new Date(atendimento.data_agendada).toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nova Data *</Label>
              <Input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Novo Horário *</Label>
              <Input
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Motivo do Reagendamento</Label>
            <Textarea
              value={motivoReagendamento}
              onChange={(e) => setMotivoReagendamento(e.target.value)}
              placeholder="Descreva o motivo do reagendamento..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleReagendar} disabled={loading} className="bg-blue-600">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reagendando...
              </>
            ) : (
              "Reagendar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}