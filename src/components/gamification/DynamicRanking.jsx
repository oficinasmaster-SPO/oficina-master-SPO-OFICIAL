import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal, TrendingUp, Star, Target } from "lucide-react";

export default function DynamicRanking({ employees, workshops }) {
  const [metric, setMetric] = useState("geral");

  const getRankIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="font-bold text-gray-600">{position}</span>;
  };

  // Cálculo de métricas compostas
  const calculateScore = (employee, type) => {
    switch (type) {
      case "geral":
        const produtividade = ((employee.production_parts || 0) + (employee.production_services || 0)) / 10000;
        const qualidade = 10 - ((employee.warnings?.length || 0) * 2);
        const engajamento = (employee.engagement_score || 0) / 10;
        return produtividade + qualidade + engajamento;
      
      case "produtividade":
        return ((employee.production_parts || 0) + (employee.production_services || 0)) / 1000;
      
      case "qualidade":
        const retrabalho = employee.warnings?.filter(w => w.reason?.includes('retrabalho')).length || 0;
        return Math.max(0, 100 - (retrabalho * 10));
      
      case "crescimento":
        const history = employee.production_history || [];
        if (history.length < 2) return 0;
        const recent = history[history.length - 1]?.total || 0;
        const previous = history[history.length - 2]?.total || 1;
        return ((recent - previous) / previous) * 100;
      
      default:
        return 0;
    }
  };

  const getRanking = (type) => {
    return employees
      .map(emp => ({
        id: emp.id,
        name: emp.full_name,
        area: emp.area,
        position: emp.position,
        score: calculateScore(emp, type),
        engagement: emp.engagement_score || 0
      }))
      .filter(emp => emp.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  };

  const metrics = [
    { key: "geral", label: "Geral", icon: Star, description: "Score combinado" },
    { key: "produtividade", label: "Produtividade", icon: TrendingUp, description: "Faturamento total" },
    { key: "qualidade", label: "Qualidade", icon: Target, description: "Baixo retrabalho" },
    { key: "crescimento", label: "Crescimento", icon: Award, description: "Evolução mensal" }
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Ranking Dinâmico - Múltiplas Métricas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={metric} onValueChange={setMetric}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {metrics.map(m => {
              const Icon = m.icon;
              return (
                <TabsTrigger key={m.key} value={m.key} className="text-xs">
                  <Icon className="w-4 h-4 mr-1" />
                  {m.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {metrics.map(m => (
            <TabsContent key={m.key} value={m.key}>
              <p className="text-sm text-gray-600 mb-4">{m.description}</p>
              <div className="space-y-2">
                {getRanking(m.key).map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        {getRankIcon(index + 1)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">{item.position} - {item.area}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        {item.score.toFixed(1)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Eng: {item.engagement}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}