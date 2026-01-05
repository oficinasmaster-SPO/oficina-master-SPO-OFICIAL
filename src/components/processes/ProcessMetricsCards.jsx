import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, CheckCircle, FileCheck, Building2, TrendingUp, Eye } from "lucide-react";

export default function ProcessMetricsCards({ 
  mapsCount, 
  itsCount, 
  frsCount, 
  implementationsCount, 
  auditsCount,
  customProcessesCount,
  onViewDetails
}) {
  const metrics = [
    {
      label: "MAPs",
      value: mapsCount,
      icon: FileText,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconColor: "text-blue-600",
      type: "maps"
    },
    {
      label: "ITs",
      value: itsCount,
      icon: ClipboardList,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconColor: "text-purple-600",
      type: "its"
    },
    {
      label: "FRs",
      value: frsCount,
      icon: FileCheck,
      color: "bg-green-50 text-green-600 border-green-200",
      iconColor: "text-green-600",
      type: "frs"
    },
    {
      label: "Implementações",
      value: implementationsCount,
      icon: CheckCircle,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      iconColor: "text-orange-600",
      type: "implementations"
    },
    {
      label: "Auditorias",
      value: auditsCount,
      icon: TrendingUp,
      color: "bg-red-50 text-red-600 border-red-200",
      iconColor: "text-red-600",
      type: "audits"
    },
    {
      label: "Processos Próprios",
      value: customProcessesCount,
      icon: Building2,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      iconColor: "text-indigo-600",
      type: "custom"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className={`${metric.color} border-2 hover:shadow-lg transition-all duration-200 cursor-pointer group`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                <span className="text-2xl font-bold">{metric.value}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{metric.label}</p>
                {metric.value > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onViewDetails(metric.type)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}