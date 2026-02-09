import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function IntegrationHealthScore() {
  const { data: healthData } = useQuery({
    queryKey: ["integration-health"],
    queryFn: async () => {
      // Mock data - calcular baseado em métricas reais
      return {
        score: 75,
        uptime: 98.5,
        successRate: 94.2,
        avgResponseTime: 245
      };
    }
  });

  if (!healthData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-600" />
          Saúde das Integrações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-gray-900">{healthData.score}%</span>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+5%</span>
            </div>
          </div>
          <Progress value={healthData.score} className="h-2" />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Uptime</span>
            <span className="font-semibold text-gray-900">{healthData.uptime}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Taxa de Sucesso</span>
            <span className="font-semibold text-gray-900">{healthData.successRate}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Tempo de Resposta</span>
            <span className="font-semibold text-gray-900">{healthData.avgResponseTime}ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}