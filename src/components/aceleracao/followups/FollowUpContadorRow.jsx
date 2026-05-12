import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Exibe uma linha de FollowUpContador
 * Mostra: contador (1/4), origem, contexto, status
 */
export default function FollowUpContadorRow({ fu, onSelect }) {
  if (!fu) return null;

  const isOverdue = !fu.data_baixa && new Date(fu.data_ciclo_fim) < new Date();
  const isConcluido = fu.status === 'concluido';

  // Renderiza contexto dinamicamente baseado em origem_tipo
  const renderContexto = () => {
    if (fu.origem_tipo === 'bucket') {
      const { reunioes_agendadas = 0, reunioes_total = 0 } = fu.contexto;
      const percentual = reunioes_total > 0 ? ((reunioes_agendadas / reunioes_total) * 100).toFixed(0) : 0;
      return (
        <div className="text-xs text-gray-600 space-y-1">
          <p>Reuniões: {reunioes_agendadas}/{reunioes_total} ({percentual}%)</p>
          {fu.contexto.proxima_reuniao_data && (
            <p>Próxima: {format(new Date(fu.contexto.proxima_reuniao_data), 'dd/MM/yyyy')}</p>
          )}
        </div>
      );
    }

    if (fu.origem_tipo === 'sprint') {
      const { tarefas_concluidas = 0, tarefas_total = 0, fase_atual = '—' } = fu.contexto;
      const percentual = tarefas_total > 0 ? ((tarefas_concluidas / tarefas_total) * 100).toFixed(0) : 0;
      return (
        <div className="text-xs text-gray-600 space-y-1">
          <p>Tarefas: {tarefas_concluidas}/{tarefas_total} ({percentual}%)</p>
          <p>Fase: {fase_atual}</p>
          {fu.contexto.revisoes_solicitadas > 0 && (
            <p className="text-orange-600 font-medium">⚠️ {fu.contexto.revisoes_solicitadas} revisão(ões) solicitada(s)</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Card
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-all ${
        isConcluido
          ? 'bg-green-50 border-green-200'
          : isOverdue
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-gray-200 hover:border-gray-400'
      }`}
    >
      <div className="space-y-3">
        {/* Header: Contador + Origem */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {/* Número do Follow-up */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
              isConcluido ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-amber-500'
            }`}>
              {fu.numero_sequencia}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">
                Follow-up {fu.numero_sequencia}
                {fu.total_esperado && `/${fu.total_esperado}`}
              </p>
              <p className="text-xs text-gray-500">
                {fu.origem_tipo === 'bucket' ? '🏢 Bucket' : '⚡ Sprint'}: {fu.origem_nome}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isConcluido && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              Concluído
            </Badge>
          )}
          {isOverdue && !isConcluido && (
            <Badge className="bg-red-100 text-red-700 border-red-300">
              Atrasado
            </Badge>
          )}
          {!isConcluido && !isOverdue && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300">
              Ativo
            </Badge>
          )}
        </div>

        {/* Contexto */}
        <div className="pl-14">
          {renderContexto()}
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pl-14">
          <Clock className="w-3 h-3" />
          {fu.data_ciclo_inicio && fu.data_ciclo_fim ? (
            <span>
              Semana de {format(new Date(fu.data_ciclo_inicio + 'T00:00:00'), 'dd/MM')} a {format(new Date(fu.data_ciclo_fim + 'T00:00:00'), 'dd/MM')}
            </span>
          ) : (
            <span>Semana atual</span>
          )}
        </div>

        {/* Histórico (se concluído) */}
        {isConcluido && fu.data_baixa && (
          <div className="text-xs text-green-600 pl-14 pt-1 border-t border-green-200">
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Concluído em {format(new Date(fu.data_baixa), 'dd/MM/yyyy')}
            {fu.historico?.at(-1)?.dias_duracao != null && ` · ${fu.historico.at(-1).dias_duracao} dias`}
          </div>
        )}

        {/* Alerta se vencido */}
        {isOverdue && !isConcluido && (
          <div className="text-xs text-red-600 pl-14 pt-1 border-t border-red-200">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            {fu.data_ciclo_fim && `Vencido em ${format(new Date(fu.data_ciclo_fim + 'T00:00:00'), 'dd/MM/yyyy')}`}
          </div>
        )}
      </div>
    </Card>
  );
}