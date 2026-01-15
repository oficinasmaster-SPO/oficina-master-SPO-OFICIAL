import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatNumber } from "@/components/utils/formatters";

export default function GapFunnelIndicator({ 
  metricName,
  realizado, 
  meta,
  funnelSteps = [] // Array de {label, realizado, meta, previous}
}) {
  const gapAbsolute = meta - realizado;
  const gapPercentage = meta > 0 ? ((realizado / meta) * 100) : 0;
  const isPositive = gapPercentage >= 100;
  
  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm text-blue-300/70">
          📊 Gap & Funil: {metricName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gap Principal */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-blue-300/70">Gap vs Meta</span>
            <Badge className={`${isPositive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              {gapPercentage.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {formatNumber(realizado)}
            </span>
            <span className="text-sm text-blue-300/70">de {formatNumber(meta)}</span>
          </div>
          {!isPositive && (
            <p className="text-xs text-red-400 mt-1">
              Faltam {formatNumber(gapAbsolute)} para atingir a meta
            </p>
          )}
        </div>

        {/* Funil de Conversão */}
        {funnelSteps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-300/70">Funil de Conversão</p>
            {funnelSteps.map((step, idx) => {
              const conversionRate = step.previous > 0 
                ? ((step.realizado / step.previous) * 100) 
                : 0;
              const metaConversionRate = step.previousMeta > 0 
                ? ((step.meta / step.previousMeta) * 100) 
                : 0;
              const achievementRate = step.meta > 0 
                ? ((step.realizado / step.meta) * 100) 
                : 0;
              
              return (
                <div key={idx} className="bg-slate-700/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-200 font-medium">{step.label}</span>
                    <Badge variant="outline" className={`text-xs ${achievementRate >= 100 ? 'border-green-400 text-green-400' : achievementRate >= 70 ? 'border-yellow-400 text-yellow-400' : 'border-red-400 text-red-400'}`}>
                      {achievementRate.toFixed(0)}% da meta
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-300/70">
                      {formatNumber(step.realizado)} / {formatNumber(step.meta)}
                    </span>
                    {idx > 0 && (
                      <span className="flex items-center gap-1 text-blue-300/70">
                        <ArrowDown className="w-3 h-3" />
                        {conversionRate.toFixed(1)}% do anterior
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}