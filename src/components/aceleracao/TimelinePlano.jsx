import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Target } from "lucide-react";

export default function TimelinePlano({ timelinePlan }) {
  if (!timelinePlan) return null;

  const phases = [
    {
      key: 'short_term',
      title: 'Curto Prazo',
      subtitle: '0-30 dias',
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      key: 'medium_term',
      title: 'Médio Prazo',
      subtitle: '30-60 dias',
      icon: TrendingUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      key: 'long_term',
      title: 'Longo Prazo',
      subtitle: '60-90 dias',
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {phases.map((phase) => {
        const Icon = phase.icon;
        const actions = timelinePlan[phase.key] || [];
        
        return (
          <Card key={phase.key} className={`border-2 ${phase.borderColor} ${phase.bgColor}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${phase.color}`}>
                <Icon className="w-5 h-5" />
                <div>
                  <div className="text-lg">{phase.title}</div>
                  <div className="text-xs font-normal text-gray-600">{phase.subtitle}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma ação definida</p>
              ) : (
                <ul className="space-y-2">
                  {actions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className={`${phase.color} font-bold mt-0.5`}>•</span>
                      <span className="text-gray-800">{action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}