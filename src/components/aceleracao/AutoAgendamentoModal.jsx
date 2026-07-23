import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calendar, Clock, User, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AutoAgendamentoModal({ open, onOpenChange, workshop, user }) {
  const [step, setStep] = useState(1); // 1: tipo, 2: confirmação, 3: resultado
  const [tipoAtendimento, setTipoAtendimento] = useState('');
  const [tiposDisponiveis, setTiposDisponiveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!open || !workshop) return;
    carregarTiposDisponiveis();
  }, [open, workshop]);

  const carregarTiposDisponiveis = async () => {
    try {
      setLoading(true);
      const regras = await base44.entities.RegraAgendamento.filter({
        $or: [
          { plan_id: workshop.planoAtual },
          { plan_id: null }
        ],
        ativo: true
      });

      if (regras && regras.length > 0) {
        const sequencia = regras[0].sequencia || [];
        setTiposDisponiveis(sequencia);
      }
    } catch (error) {
      toast.error('Erro ao carregar tipos de atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAgendamento = async () => {
    if (!tipoAtendimento) {
      toast.error('Selecione um tipo de atendimento');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('criarAutoAgendamento', {
        workshop_id: workshop.id,
        tipo_atendimento_id: tipoAtendimento
      });

      if (response.data?.success) {
        setResultado(response.data);
        setStep(3);
        toast.success(response.data.message || 'Agendamento realizado com sucesso!');
      } else {
        toast.error(response.data?.error || 'Erro ao agendar');
      }
    } catch (error) {
      toast.error('Erro ao processar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleFechar = () => {
    setStep(1);
    setTipoAtendimento('');
    setResultado(null);
    onOpenChange(false);
  };

  const tipoSelecionado = tiposDisponiveis.find(t => t.tipo_atendimento_id === tipoAtendimento);

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Agendar Atendimento</DialogTitle>
              <DialogDescription>
                {workshop?.name || 'Sua oficina'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Tipo de Atendimento</Label>
                <Select value={tipoAtendimento} onValueChange={setTipoAtendimento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDisponiveis.map(tipo => (
                      <SelectItem key={tipo.tipo_atendimento_id} value={tipo.tipo_atendimento_id}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tipoSelecionado && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-sm">
                  {tipoSelecionado.prazo_dias_apos_inicio > 0 && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-blue-900">
                        Deve ser realizado em até <strong>{tipoSelecionado.prazo_dias_apos_inicio} dias</strong> após início do programa
                      </span>
                    </div>
                  )}
                  {tipoSelecionado.intervalo_minimo_dias > 0 && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-blue-900">
                        Intervalo mínimo de <strong>{tipoSelecionado.intervalo_minimo_dias} dias</strong> entre atendimentos
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleFechar} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarAgendamento}
                  disabled={!tipoAtendimento || loading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 3 && resultado && (
          <>
            <DialogHeader>
              <DialogTitle>
                {resultado.agendado ? '✓ Agendamento Confirmado' : '📋 Solicitação Registrada'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className={`rounded-lg p-4 ${resultado.agendado ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                {resultado.agendado ? (
                  <>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-medium text-green-900">Atendimento Agendado!</p>
                        <div className="space-y-1 text-sm text-green-800">
                          <p><strong>Data e Hora:</strong> {format(new Date(resultado.data_agendada), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                          <p><strong>Consultor:</strong> {resultado.consultor}</p>
                          <p><strong>Tipo:</strong> {resultado.tipo_atendimento}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-medium text-yellow-900">Você está na fila de espera</p>
                        <p className="text-sm text-yellow-800">
                          Não há horários disponíveis no momento. Você será notificado assim que um horário ficar livre.
                        </p>
                        <p className="text-xs text-yellow-700 mt-2">
                          <strong>ID da solicitação:</strong> {resultado.solicitacao_id}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleFechar} className="w-full bg-red-600 hover:bg-red-700">
                Fechar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}