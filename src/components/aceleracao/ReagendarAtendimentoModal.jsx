import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { STATUS_POS_VENDA, MOTIVOS_CLIENTE, MOTIVOS_EMPRESA, RESPONSABILIDADE_OPTIONS } from "./ReagendamentoFilterOptions";

export default function ReagendarAtendimentoModal({ atendimento, workshop, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [statusPosvenda, setStatusPosvenda] = useState("");
  const [responsabilidade, setResponsabilidade] = useState("");
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [descricaoManual, setDescricaoManual] = useState("");

  const handleReagendar = async () => {
    if (!novaData || !novoHorario) {
      toast.error("Preencha nova data e horário");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      const novaDataHora = `${novaData}T${novoHorario}:00`;

      // Se for cancelamento sem reagendamento, mantém status "atrasado". Caso contrário, muda para "reagendado"
      const statusFinal = ['cancelada_cliente_sem_reagendar', 'cancelada_empresa_sem_reagendar'].includes(statusPosvenda)
        ? 'atrasado'
        : 'reagendado';

      const updateData = {
        data_agendada: novaDataHora,
        status: statusFinal,
        motivo_reagendamento: descricaoManual,
        status_posta_venda: statusPosvenda,
        responsabilidade: responsabilidade
      };

      // Adicionar motivo específico conforme a responsabilidade
      if (responsabilidade === 'cliente') {
        updateData.motivo_cancelamento_cliente = motivoSelecionado;
      } else if (responsabilidade === 'empresa') {
        updateData.motivo_cancelamento_empresa = motivoSelecionado;
      }

      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, updateData);

      // Criar ata de reagendamento
      const ataCount = await base44.entities.MeetingMinutes.list();
      const code = `AT.${String(ataCount.length + 1).padStart(4, '0')}`;

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
        pautas: `${statusFinal === 'atrasado' ? 'Cancelamento (sem reagendamento)' : 'Reagendamento'} de atendimento - ${statusPosvenda}`,
        objetivos_atendimento: `Atendimento reagendado de ${new Date(atendimento.data_agendada).toLocaleString('pt-BR')} para ${new Date(novaDataHora).toLocaleString('pt-BR')}`,
        objetivos_consultor: descricaoManual || "Reagendamento conforme necessidade",
        proximos_passos: [{
          descricao: `Realizar atendimento na nova data: ${new Date(novaDataHora).toLocaleString('pt-BR')}`,
          responsavel: user.full_name,
          prazo: novaData
        }],
        visao_geral_projeto: `Histórico: Atendimento original agendado para ${new Date(atendimento.data_agendada).toLocaleString('pt-BR')} foi reagendado. Responsabilidade: ${responsabilidade}.`,
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

  const motivosFiltrados = responsabilidade === 'cliente' ? MOTIVOS_CLIENTE : 
                           responsabilidade === 'empresa' ? MOTIVOS_EMPRESA : {};

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reagendar Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Cliente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Cliente:</strong> {workshop?.name}
            </p>
            <p className="text-sm text-blue-900">
              <strong>Data Atual:</strong> {new Date(atendimento.data_agendada).toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Nova Data e Hora */}
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

          {/* Status Pós-Venda */}
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

          {/* Responsabilidade */}
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

          {/* Alerta para responsabilidade do cliente */}
          {responsabilidade === 'cliente' && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">📧 E-mail automático será enviado</p>
                <p>
                  O cliente receberá notificação automática informando que este atendimento será contabilizado como realizado com sucesso, conforme o contrato comercial, independentemente de agendamento futuro. O registro será mantido como evidência.
                </p>
              </div>
            </div>
          )}

          {/* Motivo Específico (dinâmico) */}
          {responsabilidade && (
            <div>
              <Label>
                Motivo {responsabilidade === 'cliente' ? 'do Cliente' : 'da Empresa'} *
              </Label>
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

          {/* Descrição Manual */}
          <div>
            <Label>Descrição Detalhada (opcional)</Label>
            <Textarea
              value={descricaoManual}
              onChange={(e) => setDescricaoManual(e.target.value)}
              placeholder="Descreva os detalhes adicionais do reagendamento..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReagendar} 
            disabled={loading || !statusPosvenda || !responsabilidade} 
            className="bg-blue-600"
          >
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