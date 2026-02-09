import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

export default function PillarDashboard({ pillars, activities }) {
  const pillarStats = useMemo(() => {
    if (!pillars || !activities) return [];

    return pillars.map(pillar => {
      const pillarActivities = activities.filter(a => a.cultural_pillar_id === pillar.id);
      const completed = pillarActivities.filter(a => a.status === 'concluida').length;
      const total = pillarActivities.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const frequencyTarget = {
        diaria: 30,
        semanal: 4,
        quinzenal: 2,
        mensal: 1,
        trimestral: 0.33
      }[pillar.target_frequency || 'mensal'];

      const isUnderworked = total < frequencyTarget;

      return {
        ...pillar,
        total,
        completed,
        pending: total - completed,
        completionRate,
        isUnderworked,
        frequencyTarget
      };
    }).sort((a, b) => b.total - a.total);
  }, [pillars, activities]);

  if (!pillars || pillars.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-600">Nenhum pilar cultural definido ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillarStats.map(pillar => (
          <Card key={pillar.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: pillar.color }}
                  />
                  {pillar.name}
                </CardTitle>
                {pillar.isUnderworked && (
                  <Badge variant="destructive" className="text-xs">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Baixa
                  </Badge>
                )}
                {!pillar.isUnderworked && pillar.total >= pillar.frequencyTarget * 1.5 && (
                  <Badge className="bg-green-600 text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Alta
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Atividades</span>
                  <span className="font-semibold">{pillar.total}</span>
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Taxa Conclusão</span>
                    <span className="font-semibold">{pillar.completionRate}%</span>
                  </div>
                  <Progress value={pillar.completionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-green-700 font-semibold">{pillar.completed}</div>
                    <div className="text-gray-600">Concluídas</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <div className="text-yellow-700 font-semibold">{pillar.pending}</div>
                    <div className="text-gray-600">Pendentes</div>
                  </div>
                </div>

                {pillar.target_frequency && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t">
                    <Target className="w-3 h-3" />
                    Meta: {pillar.target_frequency}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}