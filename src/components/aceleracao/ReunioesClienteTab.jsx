import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import SugerirNovoHorarioModal from './SugerirNovoHorarioModal';

export default function ReunioesClienteTab({ workshopId, user }) {
  const queryClient = useQueryClient();
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);
  const [consultorAtendimento, setConsultorAtendimento] = useState(null);

  // Fetch reuniões futuras
  const { data: reunioes = [], isLoading } = useQuery({
    queryKey: ['atendimentos-acelerador', 'reunioes-futuras', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const list = await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshopId, status: { $in: ['agendado', 'confirmado'] } },
        'data_agendada',
        50
      );
      return (list || [])
        .filter(a => isFuture(new Date(a.data_agendada)))
        .sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada));
    },
    enabled: !!workshopId
  });

  // Mutação: Confirmar presença
  const confirmarPresencaMutation = useMutation({
    mutationFn: (atendimentoId) =>
      base44.functions.invoke('confirmarPresencaAtendimento', {
        atendimento_id: atendimentoId,
        workshop_id: workshopId
      }),
    onSuccess: () => {
      toast.success('Presença confirmada com sucesso!');
      queryClient.invalidateQueries({
        queryKey: ['atendimentos-acelerador', 'reunioes-futuras', workshopId]
      });
    },
    onError: (err) => toast.error('Erro ao confirmar: ' + err.message)
  });



  const getStatusBadge = (status) => {
    const colors = {
      agendado: 'bg-blue-100 text-blue-800',
      confirmado: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reuniões Futuras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reunioes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reuniões Futuras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhuma reunião agendada</p>
            <p className="text-sm mt-1">Novos agendamentos aparecerão aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reuniões Futuras
            <Badge className="ml-auto">{reunioes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reunioes.map(atendimento => (
              <div
                key={atendimento.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <Badge className={getStatusBadge(atendimento.status)}>
                        {atendimento.status === 'agendado' ? 'Agendado' : 'Confirmado'}
                      </Badge>
                      <span className="text-sm font-medium text-gray-800">
                        {atendimento.tipo_atendimento || 'Atendimento'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        {format(new Date(atendimento.data_agendada), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-blue-500" />
                        {format(new Date(atendimento.data_agendada), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                        <User className="w-4 h-4 text-blue-500" />
                        {atendimento.consultor_nome || 'Consultor não definido'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {atendimento.status === 'agendado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-700 hover:bg-green-50"
                        disabled={confirmarPresencaMutation.isPending}
                        onClick={() => confirmarPresencaMutation.mutate(atendimento.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Confirmar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAtendimentoSelecionado(atendimento);
                        setConsultorAtendimento({
                          nome: atendimento.consultor_nome,
                          id: atendimento.consultor_id
                        });
                        setShowSuggestModal(true);
                      }}
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Sugerir Horário
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Sugerir novo horário */}
      <SugerirNovoHorarioModal
        isOpen={showSuggestModal}
        onClose={() => {
          setShowSuggestModal(false);
          setAtendimentoSelecionado(null);
          setConsultorAtendimento(null);
        }}
        atendimento={atendimentoSelecionado}
        consultor={consultorAtendimento}
      />
    </>
  );
}