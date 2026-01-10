import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown } from "lucide-react";

export default function SaturacaoConsultorItem({ consultor, onExpand }) {
  const getStatusColor = (status) => {
    const cores = {
      critico: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-600' },
      alto: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'bg-orange-600' },
      medio: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-600' },
      baixo: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-600' }
    };
    return cores[status] || cores.baixo;
  };

  const getProgressColor = (indice) => {
    if (indice > 150) return 'bg-red-600';
    if (indice > 100) return 'bg-orange-600';
    if (indice > 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const cor = getStatusColor(consultor.status_gargalo);
  const progressColor = getProgressColor(consultor.indice_saturacao);

  return (
    <button
      onClick={() => onExpand(consultor)}
      className={`w-full p-4 rounded-lg border ${cor.bg} hover:shadow-md transition-all text-left`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-4 h-4 rounded-full ${cor.badge}`}></div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{consultor.consultor_nome}</h3>
            <div className="mt-2 space-y-2">
              <Progress 
                value={Math.min(consultor.indice_saturacao, 200)} 
                max={200} 
                className="h-2"
              />
              <div className="text-xs text-gray-600">
                {consultor.status_gargalo === 'critico' && 'Sobrecarga severa'}
                {consultor.status_gargalo === 'alto' && 'Sobrecarga'}
                {consultor.status_gargalo === 'medio' && 'Capacidade boa'}
                {consultor.status_gargalo === 'baixo' && 'Capacidade disponível'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`${cor.badge} text-white`}>
            {(consultor.indice_saturacao ?? 0).toFixed(0)}%
          </Badge>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </button>
  );
}