import React, { useEffect } from 'react';
import { X, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { getSeverityIcon } from '@/utils/severityCalculator';

export default function DemandToast({ demand, onDismiss, onView }) {
  // Auto-dismiss se não RED
  useEffect(() => {
    if (demand.severity === 'RED') return; // RED permanece até user fechar

    const timer = setTimeout(() => {
      onDismiss?.();
    }, 8000); // 8 segundos

    return () => clearTimeout(timer);
  }, [demand.severity, onDismiss]);

  const bgColor =
    demand.severity === 'RED'
      ? 'bg-red-50 border-red-200'
      : demand.severity === 'YELLOW'
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-blue-50 border-blue-200';

  const textColor =
    demand.severity === 'RED'
      ? 'text-red-800'
      : demand.severity === 'YELLOW'
      ? 'text-yellow-800'
      : 'text-blue-800';

  const titleColor =
    demand.severity === 'RED'
      ? 'text-red-900'
      : demand.severity === 'YELLOW'
      ? 'text-yellow-900'
      : 'text-blue-900';

  return (
    <div
      className={`rounded-lg border p-3.5 shadow-lg backdrop-blur-sm ${bgColor} animate-slide-up max-w-sm`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0">
          {getSeverityIcon(demand.severity)}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${titleColor}`}>
            {demand.demandType === 'sprint' && 'Sprint'}
            {demand.demandType === 'pedido' && 'Pedido Interno'}
            {demand.demandType === 'tarefa' && 'Tarefa'}
            {demand.demandType === 'cronograma' && 'Cronograma'}
            {' '}
            {demand.severity === 'RED' ? 'Crítico' : 'Atenção'}
          </p>
          <p className={`text-sm ${textColor} mt-0.5 truncate`}>
            {demand.title}
          </p>
          <p className={`text-xs ${textColor} opacity-80 mt-1`}>
            {demand.reason}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss?.()}
          className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
            demand.severity === 'RED'
              ? 'hover:bg-red-100 text-red-600'
              : demand.severity === 'YELLOW'
              ? 'hover:bg-yellow-100 text-yellow-600'
              : 'hover:bg-blue-100 text-blue-600'
          }`}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action button se RED */}
      {demand.severity === 'RED' && (
        <button
          onClick={() => onView?.()}
          className={`mt-2.5 w-full py-1.5 text-xs font-medium rounded transition-colors ${
            demand.severity === 'RED'
              ? 'bg-red-200 hover:bg-red-300 text-red-900'
              : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
          }`}
        >
          Ver detalhes
        </button>
      )}
    </div>
  );
}