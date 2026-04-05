import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientesRiscoPanel({ clientes = [] }) {
  const criticos = clientes.filter(c => c.nivel === "CRÍTICO").length;
  const altos = clientes.filter(c => c.nivel === "ALTO").length;
  const medios = clientes.filter(c => c.nivel === "MÉDIO").length;

  const corNivel = { "CRÍTICO": "#dc2626", "ALTO": "#d97706", "MÉDIO": "#2563eb" };
  const bgNivel = { "CRÍTICO": "#fef2f2", "ALTO": "#fffbeb", "MÉDIO": "#eff6ff" };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Clientes em Risco
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-600 font-bold text-2xl">{criticos}</p>
            <p className="text-red-700 text-sm font-medium">Crítico</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-amber-600 font-bold text-2xl">{altos}</p>
            <p className="text-amber-700 text-sm font-medium">Alto</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-600 font-bold text-2xl">{medios}</p>
            <p className="text-blue-700 text-sm font-medium">Médio</p>
          </div>
        </div>

        {clientes.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhum cliente em risco no momento 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-center font-semibold">Risco</th>
                  <th className="px-3 py-2 text-center font-semibold">Faltas</th>
                  <th className="px-3 py-2 text-left font-semibold">Consultor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientes.slice(0, 5).map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        style={{
                          backgroundColor: bgNivel[c.nivel],
                          color: corNivel[c.nivel],
                          border: `1px solid ${corNivel[c.nivel]}20`
                        }}
                        variant="outline"
                      >
                        {c.nivel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center text-red-600 font-bold">{c.faltas30}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{c.consultor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientes.length > 5 && (
              <p className="text-xs text-gray-500 text-center mt-3">
                + {clientes.length - 5} cliente(s) em risco
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}