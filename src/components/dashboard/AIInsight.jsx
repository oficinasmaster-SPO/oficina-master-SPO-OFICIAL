import React from "react";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AIInsight({ insights = [] }) {
  const getIcon = (type) => {
    switch (type) {
      case "positive": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "negative": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "up": return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case "down": return <TrendingDown className="w-5 h-5 text-orange-600" />;
      default: return <Sparkles className="w-5 h-5 text-purple-600" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case "positive": return "bg-green-50 border-green-200";
      case "negative": return "bg-red-50 border-red-200";
      case "up": return "bg-blue-50 border-blue-200";
      case "down": return "bg-orange-50 border-orange-200";
      default: return "bg-purple-50 border-purple-200";
    }
  };

  if (insights.length === 0) return null;

  return (
    <Card className="shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Análise Inteligente</h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border-2 ${getBgColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getIcon(insight.type)}
                <p className="text-sm text-gray-800 flex-1">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}