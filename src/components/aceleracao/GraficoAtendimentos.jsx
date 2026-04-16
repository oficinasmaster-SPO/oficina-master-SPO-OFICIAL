import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ClipboardList, CheckCircle2, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  ATENDIMENTO_STATUS,
  ATENDIMENTO_STATUS_LABELS,
  ATENDIMENTO_STATUS_CHART_COLORS,
  REALIZADO_SEM_ATA,
  getVisualStatus
} from "@/components/lib/ataConstants";

const STATUS_ORDER = [
  ATENDIMENTO_STATUS.REALIZADO,
  REALIZADO_SEM_ATA,
  ATENDIMENTO_STATUS.AGENDADO,
  ATENDIMENTO_STATUS.CONFIRMADO,
  ATENDIMENTO_STATUS.PARTICIPANDO,
  ATENDIMENTO_STATUS.ATRASADO,
  ATENDIMENTO_STATUS.REAGENDADO,
  ATENDIMENTO_STATUS.A_REALIZAR,
  ATENDIMENTO_STATUS.CANCELADO,
  ATENDIMENTO_STATUS.FALTOU,
];

export default function GraficoAtendimentos({ atendimentos = [], workshops = [], onStatusClick }) {
  const data = useMemo(() => {
    const counts = {};
    atendimentos.forEach(a => {
      const vs = getVisualStatus(a);
      if (vs) counts[vs] = (counts[vs] || 0) + 1;
    });

    return STATUS_ORDER
      .filter(s => (counts[s] || 0) > 0)
      .map(s => ({
        status: s === REALIZADO_SEM_ATA ? ATENDIMENTO_STATUS.REALIZADO : s,
        name: (ATENDIMENTO_STATUS_LABELS[s] || s).replace('! ', ''),
        value: counts[s] || 0,
        fill: ATENDIMENTO_STATUS_CHART_COLORS[s] || '#6b7280',
      }));
  }, [atendimentos]);

  // Últimas reuniões realizadas (até 8)
  const reunioesRecentes = React.useMemo(() => {
    return atendimentos
      .filter(a => a.status === 'realizado')
      .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada))
      .slice(0, 6);
  }, [atendimentos]);

  const formatarTipo = (tipo) => {
    if (!tipo) return '';
    return tipo.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatarData = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd/MM/yy');
    } catch { return ''; }
  };

  const formatarHora = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'HH:mm');
    } catch { return ''; }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Status dos Atendimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => [value, 'Atendimentos']} />
            <Bar dataKey="value" cursor="pointer" onClick={(entry) => onStatusClick?.(entry.status)}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Histórico de reuniões recentes */}
        {reunioesRecentes.length > 0 && (
          <div className="border-t pt-4 flex-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Últimos Concluídos
              </div>
              <span className="w-20 text-left">Data</span>
              <span className="w-20 text-left">Encerram.</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {reunioesRecentes.map(r => (
                <div
                  key={r.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-2.5 px-3 rounded-lg cursor-default transition-all hover:bg-green-50 hover:shadow-sm group border border-transparent hover:border-green-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 group-hover:bg-green-600 transition-colors" />
                    <span className="text-sm text-gray-700 truncate group-hover:text-gray-900 font-medium transition-colors">
                      {workshops.find(w => w.id === r.workshop_id)?.name || r.workshop_nome || formatarTipo(r.tipo_atendimento)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors w-20 text-left whitespace-nowrap">
                    {formatarData(r.data_realizada || r.data_agendada)}
                  </span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors w-20 text-left whitespace-nowrap">
                    {r.hora_fim_real ? formatarHora(r.hora_fim_real) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}