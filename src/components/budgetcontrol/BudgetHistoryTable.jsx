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

        // Calcular separado por tipo (receita vs despesa)
        let totalMetaReceita = 0, totalRealizadoReceita = 0;
        let totalMetaDespesa = 0, totalRealizadoDespesa = 0;

        (metas || []).forEach(meta => {
          if (meta.controlar_orcamento === false) return; // respeitar flag
          const meta_rs = meta.meta_percentual
            ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
            : (meta.meta_fixa_rs || 0);
          if (!meta_rs) return;

          const realizadoMeta = (lancamentos || [])
            .filter(l =>
              l.categoria === meta.categoria &&
              (l.descricao === meta.item || l.subcategoria === meta.item || l.categoria === meta.item)
            )
            .reduce((sum, l) => sum + (l.valor || 0), 0);

          if (meta.tipo === "receita") {
            totalMetaReceita += meta_rs;
            totalRealizadoReceita += realizadoMeta;
          } else {
            totalMetaDespesa += meta_rs;
            totalRealizadoDespesa += realizadoMeta;
          }
        });

        const economiaDespesa = totalMetaDespesa - totalRealizadoDespesa;
        const atingimentoReceita = totalMetaReceita > 0
          ? (totalRealizadoReceita / totalMetaReceita) * 100 : null;

        result[m] = {
          totalMetaReceita, totalRealizadoReceita,
          totalMetaDespesa, totalRealizadoDespesa,
          economiaDespesa, atingimentoReceita,
          metas: metas?.length || 0
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
                <th className="text-right py-3 px-3 font-semibold text-green-700">📈 Meta Receita</th>
                <th className="text-right py-3 px-3 font-semibold text-green-700">Realizado</th>
                <th className="text-right py-3 px-3 font-semibold text-green-700">Atingimento</th>
                <th className="text-right py-3 px-3 font-semibold text-red-700">📉 Teto Despesa</th>
                <th className="text-right py-3 px-3 font-semibold text-red-700">Realizado</th>
                <th className="text-right py-3 px-3 font-semibold text-red-700">Economia</th>
              </tr>
            </thead>
            <tbody>
              {meses.map(m => {
                const data = historicoMetas[m] || {};
                if (!data.metas) {
                  return (
                    <tr key={m} className="border-b text-gray-400">
                      <td className="py-3 px-3 font-medium">{m}</td>
                      <td className="text-right py-3 px-3" colSpan={6}>Sem metas configuradas</td>
                    </tr>
                  );
                }

                const atg = data.atingimentoReceita;
                const atgOk = atg !== null && atg >= 100;
                const atgWarn = atg !== null && atg >= 80 && atg < 100;
                const econOk = data.economiaDespesa >= 0;

                return (
                  <tr key={m} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{m}</td>
                    <td className="text-right py-3 px-3 text-gray-600">{formatCurrency(data.totalMetaReceita || 0)}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(data.totalRealizadoReceita || 0)}</td>
                    <td className={`text-right py-3 px-3 font-semibold ${atgOk ? 'text-green-600' : atgWarn ? 'text-yellow-600' : 'text-red-600'}`}>
                      {atg !== null ? `${formatNumber(atg, 0)}%` : '—'}
                    </td>
                    <td className="text-right py-3 px-3 text-gray-600">{formatCurrency(data.totalMetaDespesa || 0)}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(data.totalRealizadoDespesa || 0)}</td>
                    <td className={`text-right py-3 px-3 font-semibold ${econOk ? 'text-green-600' : 'text-red-600'}`}>
                      {econOk ? '+' : ''}{formatCurrency(data.economiaDespesa || 0)}
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