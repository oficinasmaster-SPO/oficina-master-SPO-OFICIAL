import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line } from "recharts";

export default function BudgetConsolidadoAnual({ ano, workshopId, metas, realizados }) {
  // Calcular totais anuais
  // FIX #1: Meta usa apenas periodicidade anual; realizado filtra apenas receitas
  const metaAnualTotal = metas.reduce((sum, m) => sum + (m.meta_fixa_rs || m.meta_anual_rs || 0), 0);
  
  // FIX #1: somar apenas receitas para comparar com meta de faturamento
  const realizadoAcumulado = realizados
    .filter(r => r.tipo === "receita")
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  const percentualAtingimento = metaAnualTotal > 0 ? (realizadoAcumulado / metaAnualTotal) * 100 : 0;
  const restante = metaAnualTotal - realizadoAcumulado;

  // Preparar dados para gráfico
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const dadosGrafico = meses.map((nomeMes, i) => {
    const mesStr = `${ano}-${String(i + 1).padStart(2, '0')}`;
    const metaMes = metas.find(m => m.mes === mesStr);

    // FIX #2: agregar (somar) todos os lançamentos de receita do mês, não pegar só o primeiro
    const realizadoMes = realizados
      .filter(r => r.mes === mesStr && r.tipo === "receita")
      .reduce((sum, r) => sum + (r.valor || 0), 0);

    // FIX #2: acumulado também filtra apenas receitas
    const acumuladoRealizado = realizados
      .filter(r => {
        const mesNum = parseInt(r.mes.split('-')[1]);
        return mesNum <= i + 1 && r.tipo === "receita";
      })
      .reduce((sum, r) => sum + (r.valor || 0), 0);

    return {
      mes: nomeMes,
      meta: metaMes?.meta_fixa_rs || (metaMes?.meta_anual_rs ? metaMes.meta_anual_rs / 12 : 0),
      realizado: realizadoMes,
      acumulado_meta: metaMes?.meta_acumulada_mes || 0,
      acumulado_realizado: acumuladoRealizado
    };
  });

  const formatMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatPercentual = (valor) => {
    return `${valor.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Anuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Meta Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-900">{formatMoeda(metaAnualTotal)}</p>
            <p className="text-xs text-blue-600 mt-1">
              Média mensal: {formatMoeda(metaAnualTotal / 12)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Realizado Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-900">{formatMoeda(realizadoAcumulado)}</p>
            <p className="text-xs text-green-600 mt-1">
              {formatPercentual(percentualAtingimento)} da meta
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${percentualAtingimento >= 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2" 
              style={{ color: percentualAtingimento >= 100 ? '#059669' : '#d97706' }}>
              {percentualAtingimento >= 100 ? <TrendingUp className="w-4 h-4" /> : <Percent className="w-4 h-4" />}
              % Atingimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${percentualAtingimento >= 100 ? 'text-emerald-900' : 'text-amber-900'}`}>
              {formatPercentual(percentualAtingimento)}
            </p>
            <p className="text-xs mt-1" style={{ color: percentualAtingimento >= 100 ? '#059669' : '#d97706' }}>
              {percentualAtingimento >= 100 ? '✅ Meta batida!' : '⚠️ Abaixo da meta'}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${
          metaAnualTotal === 0 ? 'bg-gray-50 border-gray-200' :
          restante >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"
              style={{ color: metaAnualTotal === 0 ? '#6b7280' : restante >= 0 ? '#7c3aed' : '#059669' }}>
              {metaAnualTotal === 0 ? <Target className="w-4 h-4" /> : restante >= 0 ? <Target className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              Restante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              metaAnualTotal === 0 ? 'text-gray-500' :
              restante >= 0 ? 'text-purple-900' : 'text-emerald-900'
            }`}>
              {metaAnualTotal === 0 ? '—' : formatMoeda(Math.abs(restante))}
            </p>
            <p className="text-xs mt-1" style={{ color: metaAnualTotal === 0 ? '#6b7280' : restante >= 0 ? '#7c3aed' : '#059669' }}>
              {metaAnualTotal === 0 ? 'Defina uma meta anual' : restante >= 0 ? 'Falta atingir' : '✅ Meta superada!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">
            📊 Acompanhamento Mensal - {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatMoeda(value)}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="meta" fill="#3b82f6" name="Meta" />
                <Bar dataKey="realizado" fill="#10b981" name="Realizado" />
                <Line type="monotone" dataKey="acumulado_meta" stroke="#f59e0b" strokeWidth={2} dot={false} name="Meta Acumulada" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">
            📋 Detalhamento por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Meta</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Realizado</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">% Atingimento</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Meta Acumulada</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Realizado Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {dadosGrafico.map((dados, i) => {
                  const pct = dados.meta > 0 ? (dados.realizado / dados.meta) * 100 : 0;
                  return (
                    <tr key={dados.mes} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{dados.mes}</td>
                      <td className="text-right py-2 px-3 text-blue-700">{formatMoeda(dados.meta)}</td>
                      <td className="text-right py-2 px-3 text-green-700">{formatMoeda(dados.realizado)}</td>
                      <td className="text-right py-2 px-3">
                        <Badge className={pct >= 100 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {formatPercentual(pct)}
                        </Badge>
                      </td>
                      <td className="text-right py-2 px-3 text-blue-600">{formatMoeda(dados.acumulado_meta)}</td>
                      <td className="text-right py-2 px-3 text-green-600">{formatMoeda(dados.acumulado_realizado)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}