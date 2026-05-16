import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SugestaoHorarioPendentePoup({ isOpen, onClose, atendimento }) {
  const queryClient = useQueryClient();
  const [decisao, setDecisao] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  
  // Buscar dados da workshop para exibir nome real
  useEffect(() => {
    if (atendimento?.workshop_id) {
      base44.entities.Workshop.read(atendimento.workshop_id)
        .then(ws => setWorkshop(ws))
        .catch(() => setWorkshop(null));
    }
  }, [atendimento]);

  const processarMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await base44.functions.invoke('processarSugestaoHorario', payload);
      return response.data;
    },
    onSuccess: (data) => {
      if (decisao === 'aceitar') {
        toast.success('✅ Sugestão aceita! Cliente foi notificado.');
      } else if (decisao === 'recusar') {
        toast.success('⏰ Sugestão recusada. Cliente foi notificado (horário original mantido).');
      }
      queryClient.invalidateQueries({ queryKey: ['consultoria-atendimentos'] });
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      setDecisao(null);
      onClose();
    },
    onError: (err) => {
      toast.error('Erro ao processar: ' + err.message);
    }
  });

  if (!atendimento || !isOpen) return null;

  const dataSugerida = new Date(`${atendimento.data_sugerida_cliente}T${atendimento.hora_sugerida_cliente}`);
  const dataOriginal = new Date(atendimento.data_agendada);

  const dataFormatada = format(dataSugerida, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dataOriginalFormatada = format(dataOriginal, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleAceitar = () => {
    setDecisao('aceitar');
    processarMutation.mutate({
      atendimento_id: atendimento.id,
      decisao: 'aceitar',
      data_nova: atendimento.data_sugerida_cliente,
      hora_nova: atendimento.hora_sugerida_cliente
    });
  };

  const handleRecusar = () => {
    setDecisao('recusar');
    processarMutation.mutate({
      atendimento_id: atendimento.id,
      decisao: 'recusar'
    });
  };

  const handleLembrarDepois = () => {
    processarMutation.mutate({
      atendimento_id: atendimento.id,
      decisao: 'lembrar_depois'
    });
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
            Sugestão de Novo Horário
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              {/* Cliente e Oficina */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-gray-900">{workshop?.name || atendimento.workshop_id}</p>
                <p className="text-xs text-gray-600 mb-2">{workshop?.city && `${workshop.city}, ${workshop.state}`}</p>
                <p className="text-gray-700"><strong>Consultor:</strong> {atendimento.consultor_nome || 'N/A'}</p>
                {atendimento.tipo_atendimento && (
                  <p className="text-gray-700 text-sm"><strong>Tipo:</strong> {atendimento.tipo_atendimento}</p>
                )}
                <p className="text-gray-600 text-sm mt-2">solicitou um novo horário para sua reunião</p>
              </div>

              {/* Horário Original */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Horário Atual (Original)</p>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span>{dataOriginalFormatada}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{format(dataOriginal, 'HH:mm')}</span>
                  </div>
                </div>
              </div>

              {/* Horário Sugerido */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Novo Horário Sugerido</p>
                <div className="border-2 border-green-300 rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <Calendar className="w-4 h-4" />
                    <span>{dataFormatada}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700 font-medium mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{atendimento.hora_sugerida_cliente}</span>
                  </div>
                </div>
              </div>

              {/* Mensagem do Cliente */}
              {atendimento.mensagem_cliente && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Mensagem do Cliente</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 italic text-gray-700">
                    "{atendimento.mensagem_cliente}"
                  </div>
                </div>
              )}

              {/* Opções de Ação */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Você pode <strong>aceitar</strong> a sugestão, <strong>recusar</strong> (mantendo o horário original), ou <strong>lembrar depois</strong>.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={handleLembrarDepois}
            disabled={processarMutation.isPending}
            className="border-gray-400 text-gray-700"
          >
            🔔 Lembrar Depois
          </Button>
          <Button
            variant="outline"
            onClick={handleRecusar}
            disabled={processarMutation.isPending}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            ❌ Recusar
          </Button>
          <AlertDialogAction
            onClick={handleAceitar}
            disabled={processarMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {processarMutation.isPending ? '⏳ Processando...' : '✅ Aceitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}