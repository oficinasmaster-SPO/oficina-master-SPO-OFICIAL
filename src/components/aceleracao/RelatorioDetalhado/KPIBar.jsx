import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export default function KPIBar({ realizados = 0, pendentes = 0, taxaRealizacao = 0 }) {
  const kpis = [
    {
      label: 'Realizados',
      valor: Math.max(0, Number(realizados) || 0),
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: 'Pendentes',
      valor: Math.max(0, Number(pendentes) || 0),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      label: 'Taxa de Realização',
      valor: `${Math.min(100, Math.max(0, Number(taxaRealizacao) || 0))}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={`kpi-${idx}`} className="border-gray-200">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-sm text-gray-600 font-medium">{kpi.label}</p>
              <p className={`text-2xl font-bold ${kpi.color} mt-1`}>{kpi.valor}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}