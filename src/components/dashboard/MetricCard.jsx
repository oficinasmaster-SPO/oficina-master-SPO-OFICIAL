import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  badges = [],
  color = "blue",
  subtitle 
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    cyan: "from-cyan-500 to-cyan-600"
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-100 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center",
          colorClasses[color]
        )}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>

      {(trend || badges.length > 0) && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {trend && (
            <div className="flex items-center gap-1">
              {trend === "up" ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend === "up" ? "text-green-600" : "text-red-600"
              )}>
                {trendValue}
              </span>
            </div>
          )}
          
          {badges.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {badges.map((badge, index) => (
                <Badge key={index} className="text-xs bg-yellow-100 text-yellow-800">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}