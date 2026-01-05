import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, CheckCircle, Clock } from "lucide-react";

export default function ChannelStats({ candidates }) {
  const totalLeads = candidates.length;
  const newLeads = candidates.filter(c => c.status === 'novo_lead').length;
  const inInterview = candidates.filter(c => c.status === 'em_entrevista').length;
  const hired = candidates.filter(c => c.status === 'contratado').length;
  const avgScore = candidates.length > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + (c.lead_score || 0), 0) / candidates.length)
    : 0;

  const stats = [
    { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-blue-600" },
    { label: "Novos Leads", value: newLeads, icon: Clock, color: "text-yellow-600" },
    { label: "Em Entrevista", value: inInterview, icon: TrendingUp, color: "text-orange-600" },
    { label: "Contratados", value: hired, icon: CheckCircle, color: "text-green-600" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <Card key={idx}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}