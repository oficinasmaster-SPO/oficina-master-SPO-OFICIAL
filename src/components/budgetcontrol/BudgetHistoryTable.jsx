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

        // Calcular meta e realizado APENAS para itens que têm meta configurada
        let totalMeta = 0;
        let totalRealizado = 0;

        (metas || []).forEach(meta => {
          const meta_rs = meta.meta_percentual
            ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
            : (meta.meta_fixa_rs || 0);
          totalMeta += meta_rs;

          // Somar apenas os lançamentos que correspondem a esta meta
          const realizadoMeta = (lancamentos || [])
            .filter(l =>
              l.categoria === meta.categoria &&
              (l.descricao === meta.item || l.subcategoria === meta.item || l.categoria === meta.item)
            )
            .reduce((sum, l) => sum + (l.valor || 0), 0);
          totalRealizado += realizadoMeta;
        });

        result[m] = {
          totalMeta,
          totalRealizado,
          metas: metas?.length || 0,
          variacao: totalMeta > 0 ? ((totalRealizado - totalMeta) / totalMeta) * 100 : 0
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
          {!Object.values(historicoMetas).some(d => d.metas > 0) ? (
            <p className="text-center text-gray-500 py-6 text-sm">Nenhuma meta configurada nos últimos 3 meses. Configure metas no card abaixo para ver o histórico.</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-3 font-semibold">Mês</th>
                <th className="text-right py-3 px-3 font-semibold">Metas</th>
                <th className="text-right py-3 px-3 font-semibold">Meta Orçada</th>
                <th className="text-right py-3 px-3 font-semibold">Realizado</th>
                <th className="text-right py-3 px-3 font-semibold">Diferença</th>
                <th className="text-right py-3 px-3 font-semibold">Variação %</th>
                <th className="text-center py-3 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {meses.map(m => {
                const data = historicoMetas[m] || { totalMeta: 0, totalRealizado: 0, variacao: 0, metas: 0 };
                if (data.metas === 0) {
                  return (
                    <tr key={m} className="border-b text-gray-400">
                      <td className="py-3 px-3 font-medium">{m}</td>
                      <td className="text-right py-3 px-3" colSpan={6}>Sem metas configuradas</td>
                    </tr>
                  );
                }
                const diferenca = data.totalRealizado - data.totalMeta;
                const isHealthy = Math.abs(data.variacao) <= 10;

                return (
                  <tr key={m} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{m}</td>
                    <td className="text-right py-3 px-3 text-gray-500">{data.metas} meta{data.metas !== 1 ? 's' : ''}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(data.totalMeta)}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(data.totalRealizado)}</td>
                    <td className={`text-right py-3 px-3 font-semibold ${diferenca >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {diferenca >= 0 ? '+' : ''}{formatCurrency(diferenca)}
                    </td>
                    <td className={`text-right py-3 px-3 font-semibold ${isHealthy ? 'text-green-600' : 'text-orange-600'}`}>
                      {data.variacao > 0 ? '+' : ''}{formatNumber(data.variacao, 1)}%
                    </td>
                    <td className="text-center py-3 px-3">
                      <Badge className={isHealthy ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                        {isHealthy ? '✅ OK' : '⚠️ Desvio'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}