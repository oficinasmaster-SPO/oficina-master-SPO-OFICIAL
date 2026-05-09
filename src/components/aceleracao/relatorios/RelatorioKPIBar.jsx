import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react';

export default function RelatorioKPIBar({ realizados = 0, pendentes = 0, taxaRealizacao = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-4 border-l-4 border-l-green-500">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-600">Realizados</p>
            <p className="text-2xl font-bold text-green-600">{realizados}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-600" />
          <div>
            <p className="text-sm text-gray-600">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Taxa de Realização</p>
            <p className="text-2xl font-bold text-blue-600">{taxaRealizacao}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}