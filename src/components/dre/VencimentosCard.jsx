import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const fmt = (v) =>
new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtData = (d) => {
  if (!d) return "";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}`;
};

/**
 * Card de próximos vencimentos (7 dias) para o Dashboard.
 * Props: workshopId, mes (YYYY-MM)
 */
export default function VencimentosCard({ workshopId, mes }) {
  const { data: lancamentos = [] } = useQuery({
    queryKey: ["dre-lancamentos-venc-card", workshopId, mes],
    queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }),
    enabled: !!workshopId && !!mes,
    staleTime: 60_000
  });

  const hoje = new Date().toISOString().split("T")[0];
  const em7Dias = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const { vencidos, venceHoje, proximos } = useMemo(() => {
    const pendentes = lancamentos.filter((l) => l.data_vencimento && !l.data_pagamento);
    return {
      vencidos: pendentes.filter((l) => l.data_vencimento < hoje),
      venceHoje: pendentes.filter((l) => l.data_vencimento === hoje),
      proximos: pendentes.filter((l) => l.data_vencimento > hoje && l.data_vencimento <= em7Dias)
    };
  }, [lancamentos, hoje, em7Dias]);

  const total = vencidos.length + venceHoje.length + proximos.length;

  if (total === 0) return null;

  return (
    <Card className="border-2 border-amber-200 bg-amber-50 mx-12">
      <CardContent className="p7 pt-1 pb- my-2 mx-6">
        <p className="text-sm font-semibold text-amber-800 mb-3">📅 Vencimentos DFC</p>
        <div className="space-y-2">
          {vencidos.length > 0 &&
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-red-700">🔴 Em atraso</span>
              <div className="text-right">
                <p className="text-sm font-bold text-red-700">{vencidos.length} item(s)</p>
                <p className="text-xs text-red-500">{fmt(vencidos.reduce((s, l) => s + l.valor, 0))}</p>
              </div>
            </div>
          }
          {venceHoje.length > 0 &&
          <div className="flex items-center justify-between bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-amber-800">⚠️ Vence hoje</span>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-800">{venceHoje.length} item(s)</p>
                <p className="text-xs text-amber-600">{fmt(venceHoje.reduce((s, l) => s + l.valor, 0))}</p>
              </div>
            </div>
          }
          {proximos.length > 0 &&
          <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Próximos 7 dias:</p>
              {proximos.slice(0, 3).map((l) =>
            <div key={l.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate flex-1 min-w-0">{l.descricao || "—"}</span>
                  <span className="shrink-0 ml-2 text-gray-500">{fmtData(l.data_vencimento)}</span>
                  <span className="shrink-0 ml-2 font-semibold text-red-600">{fmt(l.valor)}</span>
                </div>
            )}
              {proximos.length > 3 &&
            <p className="text-xs text-gray-400">+{proximos.length - 3} mais...</p>
            }
            </div>
          }
        </div>
      </CardContent>
    </Card>);

}