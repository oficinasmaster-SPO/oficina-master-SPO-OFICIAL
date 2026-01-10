import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function GargalosConsultores({ consultores }) {
  // Dados de exemplo para demonstração (remover quando tiver dados reais)
  const dadosExemplo = [
    {
      id: '1',
      nome: 'João Silva',
      capacidade_semanal: 28.0,
      carga_ativa: 22.4,
      produtividade_media: 0.70,
      indice_saturacao: 0.8,
      atendimentos_ativos: 8
    },
    {
      id: '2',
      nome: 'Maria Santos',
      capacidade_semanal: 28.0,
      carga_ativa: 25.2,
      produtividade_media: 0.70,
      indice_saturacao: 0.9,
      atendimentos_ativos: 9
    },
    {
      id: '3',
      nome: 'Pedro Costa',
      capacidade_semanal: 28.0,
      carga_ativa: 30.8,
      produtividade_media: 0.70,
      indice_saturacao: 1.1,
      atendimentos_ativos: 11
    }
  ];

  const dadosParaExibir = consultores?.length > 0 ? consultores : dadosExemplo;

  if (!dadosParaExibir || dadosParaExibir.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Gargalos - Consultores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIS = (is) => {
    if (is <= 0.8) {
      return { 
        label: "Saudável", 
        icon: CheckCircle, 
        color: "bg-green-100 text-green-800",
        barColor: "bg-green-500"
      };
    }
    if (is <= 1.0) {
      return { 
        label: "Atenção", 
        icon: AlertTriangle, 
        color: "bg-yellow-100 text-yellow-800",
        barColor: "bg-yellow-500"
      };
    }
    return { 
      label: "Gargalo", 
      icon: AlertTriangle, 
      color: "bg-red-100 text-red-800",
      barColor: "bg-red-500"
    };
  };

  const consultoresOrdenados = [...dadosParaExibir].sort((a, b) => b.indice_saturacao - a.indice_saturacao);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Gargalos - Consultores</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Índice de Saturação (IS) = Carga Ativa ÷ Capacidade Semanal
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Consultor</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Capacidade (h/sem)</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Carga Ativa (h)</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Produtividade</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">IS</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Status</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Saturação</th>
              </tr>
            </thead>
            <tbody>
              {consultoresOrdenados.map((consultor) => {
                const status = getStatusIS(consultor.indice_saturacao);
                const StatusIcon = status.icon;
                const saturacaoPercentual = Math.min(consultor.indice_saturacao * 100, 100);

                return (
                  <tr key={consultor.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{consultor.nome}</td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-gray-700">
                        {consultor.capacidade_semanal?.toFixed(1) || 0}h
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-blue-600">
                        {consultor.carga_ativa?.toFixed(1) || 0}h
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm text-gray-600">
                        {(consultor.produtividade_media * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-bold text-lg ${
                        consultor.indice_saturacao > 1.0 ? 'text-red-600' :
                        consultor.indice_saturacao > 0.8 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {consultor.indice_saturacao?.toFixed(2) || 0}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={saturacaoPercentual} 
                          className="h-2 flex-1"
                          indicatorClassName={status.barColor}
                        />
                        <span className="text-xs text-gray-600 min-w-[3rem] text-right">
                          {saturacaoPercentual.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">Legenda:</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>IS ≤ 0,8: Saudável</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>IS 0,8 - 1,0: Atenção</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>IS > 1,0: Gargalo</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}