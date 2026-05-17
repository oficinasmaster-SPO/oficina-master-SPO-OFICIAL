import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function BudgetHistoryTable({ workshopId, mes }) {
  // Obter últimos 3 meses (formato YYYY-MM)
  const getMesAnterior = (mesStr, meses = 1) => {
    const [ano, mes] = mesStr.split("-").map(Number);
    let newMes = mes - meses;
    let newAno = ano;
    while (newMes <= 0) {
      newMes += 12;
      newAno -= 1;
    }
    return `${newAno}-${String(newMes).padStart(2, "0")}`;
  };

  const meses = [mes, getMesAnterior(mes, 1), getMesAnterior(mes, 2)];

  // Buscar dados para os 3 meses
  const { data: historicoMetas = {}, isLoading } = useQuery({
    queryKey: ["budget-historico", workshopId, meses],
    queryFn: async () => {
      if (!workshopId) return {};

      const result = {};
      for (const m of meses) {
        const metas = await base44.entities.BudgetMeta.filter({
          workshop_id: workshopId,
          mes: m
        });
        
        const lancamentos = await base44.entities.DRELancamento.filter({
          workshop_id: workshopId,
          mes: m
        });

        const totalMeta = (metas || []).reduce((sum, meta) => {
          const m_rs = meta.meta_percentual 
            ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
            : meta.meta_fixa_rs;
          return sum + m_rs;
        }, 0);

        const totalRealizado = (lancamentos || []).reduce((sum, l) => sum + (l.valor || 0), 0);

        result[m] = {
          totalMeta,
          totalRealizado,
          variacao: totalMeta > 0 ? ((totalMeta - totalRealizado) / totalMeta) * 100 : 0
        };
      }

      return result;
    },
    enabled: !!workshopId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Histórico de Variações (Últimos 3 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-3 font-semibold">Mês</th>
                <th className="text-right py-3 px-3 font-semibold">Meta Total</th>
                <th className="text-right py-3 px-3 font-semibold">Real Total</th>
                <th className="text-right py-3 px-3 font-semibold">Diferença</th>
                <th className="text-right py-3 px-3 font-semibold">Variação %</th>
                <th className="text-center py-3 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {meses.map(m => {
                const data = historicoMetas[m] || { totalMeta: 0, totalRealizado: 0, variacao: 0 };
                const isHealthy = data.variacao > -5;
                const diferenca = data.totalMeta - data.totalRealizado;

                return (
                  <tr key={m} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{m}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(data.totalMeta)}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(data.totalRealizado)}</td>
                    <td className={`text-right py-3 px-3 font-semibold ${diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diferenca >= 0 ? '+' : ''}{formatCurrency(diferenca)}
                    </td>
                    <td className={`text-right py-3 px-3 font-semibold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                      {data.variacao > 0 ? '+' : ''}{formatNumber(data.variacao, 1)}%
                    </td>
                    <td className="text-center py-3 px-3">
                      <Badge className={isHealthy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {isHealthy ? '✅ OK' : '❌ Alerta'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}