import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, Users, Clock } from "lucide-react";

export default function PedagogicalInsights({ 
  mostAbandoned,
  mostRewatched,
  highestFailureRate,
  avgTimeComparison
}) {
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insights Pedagógicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Most Abandoned */}
          {mostAbandoned && mostAbandoned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <p className="font-medium text-sm">Aulas com Maior Abandono</p>
              </div>
              <div className="space-y-2">
                {mostAbandoned.map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm">{lesson.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {lesson.abandonmentRate}% abandono
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Most Rewatched */}
          {mostRewatched && mostRewatched.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="font-medium text-sm">Aulas Mais Reassistidas</p>
              </div>
              <div className="space-y-2">
                {mostRewatched.map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">{lesson.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {lesson.rewatchCount}x
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highest Failure Rate */}
          {highestFailureRate && highestFailureRate.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <p className="font-medium text-sm">Maior Taxa de Reprovação</p>
              </div>
              <div className="space-y-2">
                {highestFailureRate.map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-sm">{lesson.title}</span>
                    <Badge variant="outline" className="text-xs text-red-700">
                      {lesson.failureRate}% reprovação
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Comparison */}
          {avgTimeComparison && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <p className="font-medium text-sm">Tempo Médio vs Estimado</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <div>
                  <p className="text-xs text-slate-600">Estimado</p>
                  <p className="font-semibold">{avgTimeComparison.estimated} min</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Real</p>
                  <p className="font-semibold">{avgTimeComparison.actual} min</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Diferença</p>
                  <Badge variant={avgTimeComparison.difference > 0 ? "default" : "outline"}>
                    {avgTimeComparison.difference > 0 ? '+' : ''}{avgTimeComparison.difference} min
                  </Badge>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}