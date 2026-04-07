import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarX, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { STATUS_POS_VENDA, MOTIVOS_CLIENTE, MOTIVOS_EMPRESA, RESPONSABILIDADE_OPTIONS } from "./ReagendamentoFilterOptions";

export default function CancelarAtendimentoModal({ atendimento, workshop, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [statusPosvenda, setStatusPosvenda] = useState("");
  const [responsabilidade, setResponsabilidade] = useState("");
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [descricaoManual, setDescricaoManual] = useState("");

  const handleCancelar = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      const updateData = {
        status: 'cancelado',
        motivo_reagendamento: descricaoManual,
        status_posta_venda: statusPosvenda,
        responsabilidade: responsabilidade
      };

      updateData.observacoes_consultor = `[Cancelado por: ${user.full_name}]\n` + (atendimento.observacoes_consultor || "");

      if (responsabilidade === 'cliente') {
        updateData.motivo_cancelamento_cliente = motivoSelecionado;
      } else if (responsabilidade === 'empresa') {
        updateData.motivo_cancelamento_empresa = motivoSelecionado;
      }

      if (atendimento.google_event_id) {
        try {
          await base44.functions.invoke('deleteGoogleMeetEvent', { eventId: atendimento.google_event_id });
          updateData.google_event_id = null;
          updateData.google_meet_link = null;
          updateData.google_calendar_link = null;
          toast.success("Evento removido do Google Calendar e vaga liberada.");
        } catch (e) {
          console.error("Erro ao deletar evento do google:", e);
        }
      }

      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, updateData);

      // Criar ata de cancelamento
      const ataCount = await base44.entities.MeetingMinutes.list();
      const code = `AT.${String(ataCount.length + 1).padStart(4, '0')}`;

      await base44.entities.MeetingMinutes.create({
        code,
        workshop_id: workshop?.id,
        atendimento_id: atendimento.id,
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_time: new Date().toTimeString().slice(0, 5),
        tipo_aceleracao: 'cancelamento',
        consultor_name: user.full_name,
        consultor_id: user.id,
        participantes: [],
        responsavel: { name: workshop?.name || "Cliente", role: "Cliente" },
        pautas: `Cancelamento de atendimento - ${STATUS_POS_VENDA[statusPosvenda] || statusPosvenda}`,
        objetivos_atendimento: `Atendimento original: ${new Date(atendimento.data_agendada).toLocaleString('pt-BR')}`,
        objetivos_consultor: descricaoManual || "Cancelamento registrado",
        proximos_passos: [],
        visao_geral_projeto: `Responsabilidade: ${RESPONSABILIDADE_OPTIONS[responsabilidade] || responsabilidade}. Motivo: ${motivoSelecionado}`,
        status: 'finalizada'
      });

      toast.success("Atendimento cancelado com sucesso!");
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const motivosFiltrados = responsabilidade === 'cliente' ? MOTIVOS_CLIENTE : 
                           responsabilidade === 'empresa' ? MOTIVOS_EMPRESA : {};

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <CalendarX className="w-5 h-5" />
            Cancelar Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-900">
              <strong>Cliente:</strong> {workshop?.name || "Não identificado"}
            </p>
            <p className="text-sm text-red-900">
              <strong>Data:</strong> {new Date(atendimento.data_agendada).toLocaleString('pt-BR')}
            </p>
          </div>

          <div>
            <Label>Status Pós-Venda *</Label>
            <Select value={statusPosvenda} onValueChange={setStatusPosvenda}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_POS_VENDA).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Responsabilidade *</Label>
            <Select value={responsabilidade} onValueChange={setResponsabilidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a responsabilidade" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESPONSABILIDADE_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {responsabilidade && (
            <div>
              <Label>Motivo {responsabilidade === 'cliente' ? 'do Cliente' : 'da Empresa'} *</Label>
              <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(motivosFiltrados).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Nome e Motivo / Justificativa detalhada *</Label>
            <Textarea
              value={descricaoManual}
              onChange={(e) => setDescricaoManual(e.target.value)}
              placeholder="Descreva quem está solicitando o cancelamento e o motivo completo..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button 
            onClick={handleCancelar} 
            disabled={loading || !statusPosvenda || !responsabilidade || !descricaoManual} 
            variant="destructive"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelando...</>
            ) : "Confirmar Cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}