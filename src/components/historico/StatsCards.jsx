import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CheckCircle, BarChart3, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StatsCards({ assessments }) {
  const stats = React.useMemo(() => {
    const total = assessments.length;
    const completed = assessments.filter(a => a.status === 'concluido').length;
    const pending = assessments.filter(a => a.status === 'pendente').length;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    
    const lastAssessment = assessments.length > 0 
      ? assessments.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;

    const last30Days = assessments.filter(a => {
      const date = new Date(a.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    }).length;

    return {
      total,
      completed,
      pending,
      completionRate,
      lastAssessment,
      last30Days
    };
  }, [assessments]);

  const cards = [
    {
      title: "Total de Avaliações",
      value: stats.total,
      icon: BarChart3,
      color: "bg-blue-100 text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100"
    },
    {
      title: "Taxa de Conclusão",
      value: `${stats.completionRate}%`,
      subtitle: `${stats.completed} de ${stats.total}`,
      icon: CheckCircle,
      color: "bg-green-100 text-green-600",
      bgColor: "bg-gradient-to-br from-green-50 to-green-100"
    },
    {
      title: "Últimos 30 Dias",
      value: stats.last30Days,
      subtitle: "avaliações realizadas",
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100"
    },
    {
      title: "Última Avaliação",
      value: stats.lastAssessment 
        ? format(new Date(stats.lastAssessment.date), "dd/MM/yyyy", { locale: ptBR })
        : "N/A",
      subtitle: stats.lastAssessment?.typeName,
      icon: Calendar,
      color: "bg-orange-100 text-orange-600",
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={`shadow-lg border-t-4 ${card.bgColor}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}