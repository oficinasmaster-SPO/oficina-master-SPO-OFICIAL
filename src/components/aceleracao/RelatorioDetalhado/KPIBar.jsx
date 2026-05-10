import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

function getSaudeConfig(taxaAtraso) {
  if (taxaAtraso <= 5)  return { label: 'Excelente', cor: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
  if (taxaAtraso <= 10) return { label: 'Saudável',  cor: 'bg-blue-100 text-blue-800',  dot: 'bg-blue-500' };
  if (taxaAtraso <= 20) return { label: 'Atenção',   cor: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' };
  return                       { label: 'Crítico',   cor: 'bg-red-100 text-red-800',    dot: 'bg-red-500' };
}

export default function KPIBar({ realizados = 0, pendentes = 0, taxaRealizacao = 0 }) {
  const total = Math.max(0, Number(realizados) || 0) + Math.max(0, Number(pendentes) || 0);
  const taxaAtraso = total > 0 ? Math.round((Math.max(0, Number(pendentes) || 0) / total) * 100) : 0;
  const saude = getSaudeConfig(taxaAtraso);

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
      bg: 'bg-blue-50',
      isTaxa: true
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
              {kpi.isTaxa && total > 0 && (
                <div className="mt-2 space-y-1">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${saude.cor}`}>
                    <span className={`w-2 h-2 rounded-full ${saude.dot}`} />
                    {saude.label} — {taxaAtraso}% de pendência
                  </span>
                  <p className="text-xs text-gray-400">Benchmark: ≤5% Excelente · ≤10% Saudável · ≤20% Atenção · &gt;20% Crítico</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}