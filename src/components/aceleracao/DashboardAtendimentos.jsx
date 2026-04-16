import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BarChart3 } from "lucide-react";

export default function DashboardAtendimentos({ atendimentos = [] }) {
  const estatisticas = React.useMemo(() => {
    const grupos = {};
    let totalAtas = 0;

    atendimentos.forEach(atendimento => {
      const tipo = atendimento.tipo_atendimento || "outros";
      grupos[tipo] = (grupos[tipo] || 0) + 1;
      if (atendimento.ata_id) totalAtas++;
    });

    return { grupos, totalAtas, totalAtendimentos: atendimentos.length };
  }, [atendimentos]);

  const formatarTipo = (tipo) => {
    return tipo
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const tiposOrdenados = Object.entries(estatisticas.grupos).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total de Atendimentos</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{estatisticas.totalAtendimentos}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">ATAs Geradas</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{estatisticas.totalAtas}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Taxa de Documentação</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">
                  {estatisticas.totalAtendimentos > 0 
                    ? Math.round((estatisticas.totalAtas / estatisticas.totalAtendimentos) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-600 opacity-60 flex items-center justify-center text-white text-xs font-bold">
                %
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Tipo — compacta inline */}
      <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
        {tiposOrdenados.length > 0 && (
          <span className="text-xs font-medium text-gray-500">Tipos:</span>
        )}
        {tiposOrdenados.map(([tipo, quantidade]) => (
          <span key={tipo} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 border border-gray-200">
            <span className="font-semibold">{quantidade}</span>
            <span className="text-gray-500">{formatarTipo(tipo)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}