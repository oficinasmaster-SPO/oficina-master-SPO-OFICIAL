import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Loader2 } from "lucide-react";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtData = (d) => {
  if (!d) return "";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}`;
};

/**
 * Card compacto para o Dashboard mostrando vencimentos dos próximos 7 dias
 * e itens vencidos em aberto.
 * 
 * Props:
 *  - workshopId: string
 *  - mes: string (YYYY-MM) — mês atual
 */
export default function ProximosVencimentosCard({ workshopId, mes }) {
  const hoje = new Date().toISOString().split("T")[0];
  const em7Dias = new Date();
  em7Dias.setDate(em7Dias.getDate() + 7);
  const limite7 = em7Dias.toISOString().split("T")[0];

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["dre-lancamentos-alertas", workshopId, mes],
    queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }),
    enabled: !!workshopId && !!mes,
    staleTime: 60_000,
  });

  const { vencidos, proximos } = useMemo(() => {
    const pendentes = lancamentos.filter(l => !l.data_pagamento && l.data_vencimento);
    return {
      vencidos: pendentes.filter(l => l.data_vencimento < hoje),
      proximos: pendentes.filter(l => l.data_vencimento >= hoje && l.data_vencimento <= limite7),
    };
  }, [lancamentos, hoje, limite7]);

  const totalVencidos = vencidos.reduce((s, l) => s + l.valor, 0);
  const totalProximos = proximos.reduce((s, l) => s + l.valor, 0);

  const semAlertas = vencidos.length === 0 && proximos.length === 0;

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="pt-4 pb-4 flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${vencidos.length > 0 ? "border-red-300" : proximos.length > 0 ? "border-amber-300" : "border-gray-200"}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className={`w-4 h-4 ${vencidos.length > 0 ? "text-red-500" : proximos.length > 0 ? "text-amber-500" : "text-gray-400"}`} />
          <p className="text-sm font-semibold text-gray-700">Vencimentos / Caixa</p>
          {(vencidos.length > 0 || proximos.length > 0) && (
            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${vencidos.length > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {vencidos.length + proximos.length} pendente(s)
            </span>
          )}
        </div>

        {semAlertas ? (
          <p className="text-xs text-gray-400 text-center py-2">✅ Nenhum vencimento pendente nos próximos 7 dias</p>
        ) : (
          <div className="space-y-2">
            {/* Vencidos */}
            {vencidos.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Vencidos em aberto ({vencidos.length})</p>
                <div className="space-y-0.5">
                  {vencidos.slice(0, 3).map((l, i) => (
                    <div key={i} className="flex justify-between text-xs text-red-600">
                      <span className="truncate mr-2">{l.descricao || "—"}</span>
                      <span className="shrink-0 font-semibold">{fmt(l.valor)}</span>
                    </div>
                  ))}
                  {vencidos.length > 3 && (
                    <p className="text-[10px] text-red-400">+{vencidos.length - 3} mais</p>
                  )}
                </div>
                <p className="text-xs font-bold text-red-700 mt-1 pt-1 border-t border-red-200 text-right">{fmt(totalVencidos)}</p>
              </div>
            )}

            {/* Próximos 7 dias */}
            {proximos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-amber-700 mb-1">🕐 Próximos 7 dias ({proximos.length})</p>
                <div className="space-y-0.5">
                  {proximos.slice(0, 3).map((l, i) => (
                    <div key={i} className="flex justify-between text-xs text-amber-700">
                      <span className="truncate mr-2">{l.descricao || "—"} <span className="text-amber-400">· {fmtData(l.data_vencimento)}</span></span>
                      <span className="shrink-0 font-semibold">{fmt(l.valor)}</span>
                    </div>
                  ))}
                  {proximos.length > 3 && (
                    <p className="text-[10px] text-amber-400">+{proximos.length - 3} mais</p>
                  )}
                </div>
                <p className="text-xs font-bold text-amber-700 mt-1 pt-1 border-t border-amber-200 text-right">{fmt(totalProximos)}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}