import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeSaturacao } from "@/components/tempo/AlertasInteligenecia";

function fmt(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "min" : ""}`.trim() : `${m}min`;
}

function BarPercent({ value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function TabelaConsultores({ porConsultor, capacidadePeriodo }) {
  if (!porConsultor?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Horas por Consultor</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-400 text-center py-8">Sem dados</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Horas por Consultor</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {porConsultor.map((c) => (
            <div key={c.consultor_id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.consultor_nome}</p>
                  <p className="text-xs text-gray-500">{c.clientes_count} clientes • {c.reunioes_count} reuniões • {c.followups_count} FUPs</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0 flex items-center gap-2">
                  <BadgeSaturacao consultor={c} capacidadePeriodo={capacidadePeriodo || 4800} />
                  <div>
                  <p className="text-base font-bold text-gray-900">{fmt(c.total_minutos)}</p>
                  <p className="text-xs text-gray-400">
                    <span className="text-blue-500">{fmt(c.minutos_reuniao)}</span>
                    {" + "}
                    <span className="text-orange-400">{fmt(c.minutos_followup)}</span>
                  </p>
                  </div>
                </div>
              </div>
              <BarPercent value={c.minutos_reuniao} total={c.total_minutos} color="bg-blue-400" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}