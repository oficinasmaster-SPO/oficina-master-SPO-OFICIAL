import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "../utils/formatters";

export default function BudgetConsolidatedReport({ calculado, metas }) {
  const summary = useMemo(() => {
    if (!metas.length) return null;

    const totalMeta = calculado.total_meta || 0;
    const totalRealizado = Object.values(calculado.por_categoria || {}).reduce((sum, cat) => sum + (cat.realizado || 0), 0);
    const totalDiferenca = totalMeta - totalRealizado;
    const variacao = totalMeta > 0 ? (totalDiferenca / totalMeta) * 100 : 0;

    // Agrupar por tipo de gasto (simplificado)
    const grupos = {
      "Operacional": metas.filter(m => ["operacional", "manutencao"].includes(m.categoria)),
      "Pessoas": metas.filter(m => m.categoria === "pessoas"),
      "Marketing": metas.filter(m => m.categoria === "marketing"),
      "Outros": metas.filter(m => ["administrativo", "financeiro", "terceirizados", "pecas"].includes(m.categoria))
    };

    const groupSummary = {};
    Object.entries(grupos).forEach(([name, items]) => {
      const meta = items.reduce((sum, m) => {
        const m_rs = m.meta_percentual 
          ? (m.meta_percentual / 100) * (m.faturamento_meta_rs || 0)
          : m.meta_fixa_rs;
        return sum + m_rs;
      }, 0);

      const realizado = items.reduce((sum, m) => {
        const calc = calculado.por_categoria[m.id] || {};
        return sum + (calc.realizado || 0);
      }, 0);

      groupSummary[name] = {
        meta,
        realizado,
        diferenca: meta - realizado,
        variacao: meta > 0 ? ((meta - realizado) / meta) * 100 : 0
      };
    });

    return {
      totalMeta,
      totalRealizado,
      totalDiferenca,
      variacao,
      grupos: groupSummary
    };
  }, [calculado, metas]);

  if (!summary) return null;

  const isHealthy = summary.variacao > -5;
  const headerColor = isHealthy ? "from-emerald-600 to-green-600" : "from-red-600 to-rose-600";

  return (
    <Card className={`bg-gradient-to-r ${headerColor} text-white mb-6`}>
      <CardHeader>
        <CardTitle className="text-xl">📋 Relatório Consolidado do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Total Meta</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalMeta)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Total Realizado</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalRealizado)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Variação Geral</p>
            <p className="text-2xl font-bold">
              {summary.variacao > 0 ? '+' : ''}{formatNumber(summary.variacao, 1)}%
            </p>
            <p className="text-xs opacity-75 mt-1">
              {summary.variacao > 0 ? '✅ Economizado' : '❌ Acima do orçamento'}
            </p>
          </div>
        </div>

        {/* Resumo por Grupo */}
        <div>
          <h3 className="text-sm font-semibold mb-3 opacity-90">Resumo por Grupo</h3>
          <div className="space-y-2">
            {Object.entries(summary.grupos).map(([name, data]) => {
              const isOverBudget = data.realizado > data.meta * 1.05;
              const isWarning = data.realizado > data.meta * 0.95;

              return (
                <div key={name} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{name}</p>
                      <p className="text-xs opacity-75">
                        {data.realizado > 0 ? formatCurrency(data.realizado) : 'Sem lançamentos'}
                      </p>
                    </div>
                    <Badge className={isOverBudget ? "bg-red-400" : isWarning ? "bg-yellow-400" : "bg-green-400"}>
                      {isOverBudget ? '❌' : isWarning ? '⚠️' : '✅'} {formatNumber(data.variacao, 1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isOverBudget ? 'bg-red-300' : isWarning ? 'bg-yellow-300' : 'bg-green-300'}`}
                      style={{ width: Math.min((data.realizado / data.meta) * 100, 100) + '%' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs opacity-75 mt-1">
                    <span>Meta: {formatCurrency(data.meta)}</span>
                    <span>{formatNumber((data.realizado / data.meta) * 100, 0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}