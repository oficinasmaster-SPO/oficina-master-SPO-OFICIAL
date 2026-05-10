import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Video, Phone } from "lucide-react";

function fmt(minutos) {
  if (!minutos) return "0min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function KPIsGerais({ totais, porConsultor }) {
  const topConsultor = porConsultor?.[0];

  const cards = [
    {
      label: "Horas Totais",
      value: fmt(totais?.total_minutos),
      sub: `${totais?.total_reunioes || 0} reuniões + ${totais?.total_followups || 0} follow-ups`,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Clientes Atendidos",
      value: totais?.clientes_atendidos || 0,
      sub: "com ao menos 1 contato no período",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Reuniões Realizadas",
      value: totais?.total_reunioes || 0,
      sub: fmt(totais?.total_minutos - (totais?.total_followup_minutos || 0)) + " em reuniões",
      icon: Video,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Top Consultor",
      value: topConsultor?.consultor_nome?.split(" ")[0] || "—",
      sub: topConsultor ? `${fmt(topConsultor.total_minutos)} • ${topConsultor.clientes_count} clientes` : "sem dados",
      icon: Phone,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${c.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">{c.label}</p>
                  <p className="text-xl font-bold text-gray-900 truncate">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{c.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}