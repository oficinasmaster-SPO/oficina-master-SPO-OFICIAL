import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, AlertTriangle, CheckCircle, HelpCircle, Star } from "lucide-react";

export default function AnalyticsOverview({ analytics }) {
  if (!analytics) return null;

  const { byType, dorasNuncaResolvidas, evolucoesTotal, percentualAcoesDef } = analytics;

  const stats = [
    {
      label: "Dores Ativas",
      value: byType.dor.length,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Dúvidas em Aberto",
      value: byType.duvida.length,
      icon: HelpCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Desejos Mapeados",
      value: byType.desejo.length,
      icon: Star,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Riscos Identificados",
      value: byType.risco.length,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      label: "Evoluções Conquistadas",
      value: evolucoesTotal,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Com Ações Definidas",
      value: `${percentualAcoesDef}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className={stat.bgColor}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color} mt-2`}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={`w-10 h-10 ${stat.color} opacity-30`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}