import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award } from "lucide-react";

export default function DesempenhoConsultoresPanel({ consultores = [] }) {
  // Ordenar por taxa de realização
  const consultoresOrdenados = [...consultores].sort(
    (a, b) => (b.taxa || 0) - (a.taxa || 0)
  );

  const getColorTaxa = (taxa) => {
    if (taxa >= 80) return "text-green-600";
    if (taxa >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getBgTaxa = (taxa) => {
    if (taxa >= 80) return "bg-green-50";
    if (taxa >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          Desempenho dos Consultores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consultoresOrdenados.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhum dado de desempenho disponível</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Consultor</th>
                  <th className="px-4 py-2 text-center font-semibold">Atendimentos</th>
                  <th className="px-4 py-2 text-center font-semibold">Realizados</th>
                  <th className="px-4 py-2 text-center font-semibold">Faltas</th>
                  <th className="px-4 py-2 text-center font-semibold">Cancelados</th>
                  <th className="px-4 py-2 text-center font-semibold">Taxa</th>
                  <th className="px-4 py-2 text-center font-semibold">Clientes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {consultoresOrdenados.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{c.total || 0}</td>
                    <td className="px-4 py-2 text-center text-green-600 font-bold">{c.realizados || 0}</td>
                    <td className="px-4 py-2 text-center text-red-600 font-bold">{c.faltaram || 0}</td>
                    <td className="px-4 py-2 text-center text-amber-600 font-bold">{c.cancelados || 0}</td>
                    <td className={`px-4 py-2 text-center font-bold ${getColorTaxa(c.taxa)}`}>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getBgTaxa(c.taxa)}`}>
                        {c.taxa || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600 font-medium">{c.clientes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {consultoresOrdenados.length > 0 && (
          <div className="mt-6 pt-4 border-t grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Taxa Média</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(consultoresOrdenados.reduce((sum, c) => sum + (c.taxa || 0), 0) / consultoresOrdenados.length)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total de Clientes</p>
              <p className="text-2xl font-bold text-green-600">
                {consultoresOrdenados.reduce((sum, c) => sum + (c.clientes || 0), 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Taxa Geral Realização</p>
              <p className="text-2xl font-bold text-purple-600">
                {consultoresOrdenados.length > 0
                  ? Math.round(
                      (consultoresOrdenados.reduce((sum, c) => sum + (c.realizados || 0), 0) /
                        consultoresOrdenados.reduce((sum, c) => sum + (c.total || 0), 0)) *
                        100
                    )
                  : 0}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}