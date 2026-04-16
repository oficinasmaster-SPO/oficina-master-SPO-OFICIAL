import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_LABELS, ATENDIMENTO_STATUS_CHART_COLORS } from "@/components/lib/ataConstants";

const STATUS_ORDER = [
  ATENDIMENTO_STATUS.AGENDADO,
  ATENDIMENTO_STATUS.CONFIRMADO,
  ATENDIMENTO_STATUS.PARTICIPANDO,
  ATENDIMENTO_STATUS.ATRASADO,
  ATENDIMENTO_STATUS.REAGENDADO,
  ATENDIMENTO_STATUS.REALIZADO,
  ATENDIMENTO_STATUS.CONCLUIDO,
  ATENDIMENTO_STATUS.A_REALIZAR,
  ATENDIMENTO_STATUS.CANCELADO,
  ATENDIMENTO_STATUS.FALTOU,
];

export default function DashboardAtendimentos({ atendimentos = [], onStatusClick }) {
  const { estatisticas, statusData } = React.useMemo(() => {
    const grupos = {};
    const statusCount = {};
    let totalAtas = 0;

    atendimentos.forEach(atendimento => {
      const tipo = atendimento.tipo_atendimento || "outros";
      grupos[tipo] = (grupos[tipo] || 0) + 1;

      const st = atendimento.status || "indefinido";
      statusCount[st] = (statusCount[st] || 0) + 1;

      if (atendimento.ata_id) totalAtas++;
    });

    const statusData = STATUS_ORDER
      .filter(s => (statusCount[s] || 0) > 0)
      .map(s => ({
        status: s,
        label: ATENDIMENTO_STATUS_LABELS[s] || s,
        count: statusCount[s] || 0,
        color: ATENDIMENTO_STATUS_CHART_COLORS[s] || '#6b7280',
      }));

    return {
      estatisticas: { grupos, totalAtas, totalAtendimentos: atendimentos.length },
      statusData,
    };
  }, [atendimentos]);

  const formatarTipo = (tipo) => {
    return tipo
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const tiposOrdenados = Object.entries(estatisticas.grupos).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total de Atendimentos</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{estatisticas.totalAtendimentos}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">ATAs Geradas</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{estatisticas.totalAtas}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Taxa de Documentação</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">
                  {estatisticas.totalAtendimentos > 0 
                    ? Math.round((estatisticas.totalAtas / estatisticas.totalAtendimentos) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-600 opacity-60 flex items-center justify-center text-white text-xs font-bold">
                %
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Status */}
      {statusData.length > 0 && (
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-2 px-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Status de Atendimento
            </h3>
            <ResponsiveContainer width="100%" height={statusData.length * 32 + 8}>
              <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={100}
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [value, 'Atendimentos']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  cursor="pointer"
                  onClick={(data) => onStatusClick?.(data.status)}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Distribuição por Tipo — compacta inline */}
      {tiposOrdenados.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Tipos:</span>
          {tiposOrdenados.map(([tipo, quantidade]) => (
            <span key={tipo} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 border border-gray-200">
              <span className="font-semibold">{quantidade}</span>
              <span className="text-gray-500">{formatarTipo(tipo)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}