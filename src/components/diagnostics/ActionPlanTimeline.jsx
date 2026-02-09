import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Target } from "lucide-react";

export default function ActionPlanTimeline({ timelinePlan }) {
  if (!timelinePlan) return null;

  const periods = [
    {
      title: "Curto Prazo (0-30 dias)",
      items: timelinePlan.short_term || [],
      icon: Clock,
      color: "orange"
    },
    {
      title: "Médio Prazo (30-60 dias)",
      items: timelinePlan.medium_term || [],
      icon: TrendingUp,
      color: "blue"
    },
    {
      title: "Longo Prazo (60-90 dias)",
      items: timelinePlan.long_term || [],
      icon: Target,
      color: "green"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline de Ações (90 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {periods.map((period, idx) => {
            const Icon = period.icon;
            return (
              <div key={idx} className="relative">
                <div className={`flex items-center gap-3 mb-3`}>
                  <div className={`p-2 rounded-lg bg-${period.color}-100`}>
                    <Icon className={`w-5 h-5 text-${period.color}-600`} />
                  </div>
                  <h4 className="font-semibold text-gray-900">{period.title}</h4>
                </div>
                <ul className="ml-14 space-y-2">
                  {period.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2">
                      <span className={`text-${period.color}-600 mt-1`}>•</span>
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}