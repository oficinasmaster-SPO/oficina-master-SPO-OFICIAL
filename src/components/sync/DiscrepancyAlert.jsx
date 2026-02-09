import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/formatters';

export default function DiscrepancyAlert({ discrepancies, onResolve, onDismiss, isLoading }) {
  if (!discrepancies || discrepancies.length === 0) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-2">
              ⚠️ Inconsistência Detectada
            </h3>
            <p className="text-sm text-amber-800 mb-3">
              Os valores no DRE diferem do Histórico de Produção em mais de 5%. Escolha qual usar:
            </p>
            <div className="space-y-2">
              {discrepancies.map((disc, idx) => (
                <div key={idx} className="text-sm bg-white p-2 rounded border border-amber-200">
                  <p className="font-medium text-gray-800">
                    {disc.field === 'revenue_parts' ? 'Faturamento Peças' : 'Faturamento Serviços'}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-1 text-xs">
                    <div>
                      <p className="text-gray-600">Histórico:</p>
                      <p className="font-bold text-blue-600">{formatCurrency(disc.historical)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">DRE:</p>
                      <p className="font-bold text-purple-600">{formatCurrency(disc.dre)}</p>
                    </div>
                  </div>
                  <p className="text-amber-700 font-semibold mt-1">
                    Diferença: {disc.diff_percent}%
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => onResolve('historical')}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Usar Histórico
              </Button>
              <Button
                size="sm"
                onClick={() => onResolve('dre')}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Usar DRE
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                disabled={isLoading}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-800 flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}