import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, AlertCircle, AlertTriangle, CheckCircle2, Target } from "lucide-react";

export default function ActionStatsCards({ stats, onStatClick }) {
  const cards = [
    {
      id: "total",
      title: "Total de Ações",
      value: stats.total,
      icon: TrendingUp,
      color: "text-gray-600",
      bg: "bg-white"
    },
    {
      id: "pendentes",
      title: "Em Aberto",
      value: stats.pendentes,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-white",
      clickable: true
    },
    {
      id: "atrasadas",
      title: "Atrasadas",
      value: stats.atrasadas,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      clickable: true,
      critical: stats.atrasadas > 0
    },
    {
      id: "paralisadas",
      title: "Paralisadas",
      value: stats.paralisadas,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      subtitle: ">7 dias sem atualização",
      clickable: true
    },
    {
      id: "proximas",
      title: "Próximas do Prazo",
      value: stats.proximas,
      icon: Target,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      subtitle: "≤3 dias",
      clickable: true
    },
    {
      id: "concluidas",
      title: "Concluídas",
      value: stats.concluidas,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-white",
      subtitle: stats.total > 0 ? `${Math.round((stats.concluidas / stats.total) * 100)}% do total` : "0%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = card.clickable && card.value > 0;

        return (
          <Card 
            key={card.id}
            className={`${card.bg} ${card.border || ""} ${
              isClickable ? "cursor-pointer hover:shadow-lg transition-all" : ""
            } ${card.critical ? "animate-pulse" : ""}`}
            onClick={isClickable ? () => onStatClick(card.id) : undefined}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-gray-700">{card.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.color}`}>
                {card.value}
              </div>
              {card.subtitle && (
                <p className="text-xs text-gray-600 mt-1">{card.subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}