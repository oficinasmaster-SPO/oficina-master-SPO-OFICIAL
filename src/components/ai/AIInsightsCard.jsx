import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, TrendingUp, Users, Target, Lightbulb } from "lucide-react";

const INSIGHT_ICONS = {
  alert: AlertTriangle,
  opportunity: TrendingUp,
  engagement: Users,
  recommendation: Target,
  prediction: Lightbulb
};

const INSIGHT_COLORS = {
  alert: "bg-red-50 border-red-200 text-red-700",
  opportunity: "bg-green-50 border-green-200 text-green-700",
  engagement: "bg-blue-50 border-blue-200 text-blue-700",
  recommendation: "bg-purple-50 border-purple-200 text-purple-700",
  prediction: "bg-orange-50 border-orange-200 text-orange-700"
};

const BADGE_COLORS = {
  alert: "bg-red-100 text-red-700",
  opportunity: "bg-green-100 text-green-700",
  engagement: "bg-blue-100 text-blue-700",
  recommendation: "bg-purple-100 text-purple-700",
  prediction: "bg-orange-100 text-orange-700"
};

export default function AIInsightsCard({ insights = [], loading = false, onActionClick }) {
  if (loading) {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
            Insights de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-400" />
            Insights de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Nenhum insight disponível no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Insights de IA ({insights.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = INSIGHT_ICONS[insight.type] || Sparkles;
            const cardColor = INSIGHT_COLORS[insight.type] || "bg-gray-50 border-gray-200 text-gray-700";
            const badgeColor = BADGE_COLORS[insight.type] || "bg-gray-100 text-gray-700";

            return (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 ${cardColor} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={badgeColor}>
                        {insight.category || insight.type}
                      </Badge>
                      {insight.priority === 'high' && (
                        <Badge className="bg-red-500 text-white">Alta Prioridade</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-1">{insight.title}</p>
                    <p className="text-sm opacity-90">{insight.description}</p>
                    
                    {insight.metrics && (
                      <div className="flex gap-3 mt-2 text-xs">
                        {Object.entries(insight.metrics).map(([key, value]) => (
                          <span key={key} className="font-medium">
                            {key}: <strong>{value}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {insight.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => onActionClick?.(insight)}
                      >
                        {insight.action.label || 'Ver Detalhes'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}