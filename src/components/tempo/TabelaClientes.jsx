import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

function fmt(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "min" : ""}`.trim() : `${m}min`;
}

function diasDesde(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TabelaClientes({ porCliente, onSelectCliente }) {
  if (!porCliente?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Horas por Cliente</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-400 text-center py-8">Sem dados</CardContent>
      </Card>
    );
  }

  const semAtencao = porCliente.filter(c => {
    const d = diasDesde(c.ultimo_contato);
    return d === null || d > 7;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Horas por Cliente</CardTitle>
          {semAtencao.length > 0 && (
            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {semAtencao.length} sem atenção há +7 dias
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="text-left px-5 py-2 font-medium">Cliente</th>
              <th className="text-right px-3 py-2 font-medium">Reuniões</th>
              <th className="text-right px-3 py-2 font-medium">FUPs</th>
              <th className="text-right px-5 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {porCliente.map((c) => {
              const dias = diasDesde(c.ultimo_contato);
              const atrasado = dias === null || dias > 7;
              return (
                <tr
                  key={c.workshop_id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${atrasado ? "bg-red-50/30" : ""}`}
                  onClick={() => onSelectCliente?.(c)}
                >
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-gray-900 truncate max-w-[180px]">{c.workshop_name}</p>
                    {atrasado && (
                      <p className="text-xs text-red-500">{dias !== null ? `${dias} dias sem contato` : "nunca contatado"}</p>
                    )}
                  </td>
                  <td className="text-right px-3 py-2.5 text-blue-600 font-medium">{fmt(c.minutos_reuniao)}</td>
                  <td className="text-right px-3 py-2.5 text-orange-500 font-medium">{fmt(c.minutos_followup)}</td>
                  <td className="text-right px-5 py-2.5 font-bold text-gray-900">{fmt(c.total_minutos)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}