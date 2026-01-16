import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";

export default function CreditosPerformanceEquipe({ data }) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Créditos de Performance por Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  const equipes = [
    {
      nome: "Marketing",
      credito: data.marketing?.credito || 0,
      pessoas: data.marketing?.pessoas || 0,
      percentual: data.marketing?.percentual || 0,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-300",
      textColor: "text-purple-700",
      dotColor: "bg-purple-500",
      badgeBg: "bg-purple-600"
    },
    {
      nome: "Comercial/SDR",
      credito: data.comercial?.credito || 0,
      pessoas: data.comercial?.pessoas || 0,
      percentual: data.comercial?.percentual || 0,
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-300",
      textColor: "text-indigo-700",
      dotColor: "bg-indigo-500",
      badgeBg: "bg-indigo-600"
    },
    {
      nome: "Vendas",
      credito: data.vendas?.credito || 0,
      pessoas: data.vendas?.pessoas || 0,
      percentual: data.vendas?.percentual || 0,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-300",
      textColor: "text-blue-700",
      dotColor: "bg-blue-500",
      badgeBg: "bg-blue-600"
    },
    {
      nome: "Técnico",
      credito: data.tecnico?.credito || 0,
      pessoas: data.tecnico?.pessoas || 0,
      percentual: data.tecnico?.percentual || 0,
      bgColor: "bg-teal-50",
      borderColor: "border-teal-300",
      textColor: "text-teal-700",
      dotColor: "bg-teal-500",
      badgeBg: "bg-teal-600"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Créditos de Performance por Equipe
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Consolidação de créditos atribuídos para cada equipe durante o período
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {equipes.map((equipe, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-4 ${equipe.bgColor} rounded-lg border ${equipe.borderColor}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 ${equipe.dotColor} rounded-full`}></div>
                <div>
                  <p className="font-semibold text-gray-900">{equipe.nome}</p>
                  <p className="text-xs text-gray-600">{equipe.pessoas} pessoa(s)</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${equipe.textColor}`}>
                  R$ {formatCurrency(equipe.credito)}
                </p>
                <Badge className={`${equipe.badgeBg} text-white text-xs`}>
                  {equipe.percentual.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}