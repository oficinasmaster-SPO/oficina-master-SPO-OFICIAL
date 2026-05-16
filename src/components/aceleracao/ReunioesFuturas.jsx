import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, User } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReunioesFuturas({ workshopId, consultorId }) {
  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['atendimentos-acelerador', 'reunioes-futuras', workshopId, consultorId],
    queryFn: async () => {
      if (!workshopId && !consultorId) return [];
      
      const filter = {};
      if (workshopId) filter.workshop_id = workshopId;
      if (consultorId) filter.consultor_id = consultorId;
      filter.status = { $in: ['agendado', 'confirmado'] };
      
      const list = await base44.entities.ConsultoriaAtendimento.filter(
        filter,
        'data_agendada',
        50
      );
      
      return (list || [])
        .filter(a => isFuture(new Date(a.data_agendada)))
        .sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada));
    },
    enabled: !!(workshopId || consultorId)
  });

  const TIPO_COLORS = {
    agendado: 'bg-blue-100 text-blue-800',
    confirmado: 'bg-green-100 text-green-800',
    onboarding: 'bg-purple-100 text-purple-800'
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            Reuniões futuras — ordenadas do mais próximo ao mais distante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (atendimentos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            Reuniões futuras — ordenadas do mais próximo ao mais distante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhuma reunião agendada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          Reuniões futuras — ordenadas do mais próximo ao mais distante
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {atendimentos.map(atendimento => (
            <div
              key={atendimento.id}
              className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-gray-600">
                    {atendimento.tipo_atendimento || 'Atendimento'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {atendimento.consultor_nome && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <User className="w-3 h-3" />
                    <span className="hidden sm:inline">{atendimento.consultor_nome}</span>
                  </div>
                )}
                <Badge className={TIPO_COLORS[atendimento.status] || 'bg-gray-100 text-gray-800'}>
                  {atendimento.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}