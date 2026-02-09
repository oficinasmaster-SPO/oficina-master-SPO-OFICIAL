import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function RitualStatsCards({ scheduledRituals, ritualsDB }) {
  const agendados = scheduledRituals.filter(r => r.status === "agendado").length;
  const concluidos = scheduledRituals.filter(r => r.status === "concluido").length;
  const atrasados = scheduledRituals.filter(r => {
    if (r.status !== "agendado") return false;
    const scheduledDate = new Date(r.scheduled_date);
    return scheduledDate < new Date();
  }).length;

  const stats = [
    {
      label: "Rituais Personalizados",
      value: ritualsDB.length,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      label: "Agendados",
      value: agendados,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Concluídos",
      value: concluidos,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Atrasados",
      value: atrasados,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-2 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}