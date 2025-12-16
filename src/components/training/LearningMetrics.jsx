import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Target, TrendingUp, Award } from "lucide-react";

export default function LearningMetrics({ 
  totalLessons,
  completedLessons,
  totalWatchTime,
  averageScore,
  strongAreas,
  weakAreas
}) {
  
  const progressPercentage = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seu Progresso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Aulas Concluídas</span>
              <span className="text-sm text-slate-600">
                {completedLessons} / {totalLessons}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-slate-500 mt-1">{progressPercentage}% completo</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-slate-600">Tempo Total</p>
                <p className="font-semibold text-sm">
                  {Math.floor(totalWatchTime / 60)}h {totalWatchTime % 60}min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Target className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-slate-600">Nota Média</p>
                <p className="font-semibold text-sm">{averageScore?.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strong & Weak Areas */}
      {(strongAreas?.length > 0 || weakAreas?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Análise de Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {strongAreas?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2 text-green-700">
                  <Award className="w-4 h-4" />
                  Pontos Fortes
                </p>
                <div className="flex flex-wrap gap-2">
                  {strongAreas.map((area, idx) => (
                    <Badge key={idx} className="bg-green-100 text-green-700">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {weakAreas?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-orange-700">
                  Áreas para Melhorar
                </p>
                <div className="flex flex-wrap gap-2">
                  {weakAreas.map((area, idx) => (
                    <Badge key={idx} variant="outline" className="border-orange-300 text-orange-700">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}