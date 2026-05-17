import React from "react";
import { formatCurrency, formatNumber } from "../utils/formatters";

export default function BudgetProgressBars({ metas, calculado }) {
  if (!metas.length) return null;

  return (
    <div className="space-y-4">
      {metas.map(meta => {
        const calc = calculado.por_categoria[meta.id] || {};
        const meta_rs = meta.meta_percentual 
          ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
          : meta.meta_fixa_rs;
        
        const percentual = meta_rs > 0 ? (calc.realizado / meta_rs) * 100 : 0;
        const isOver = calc.realizado > meta_rs * 1.05;
        const isWarning = calc.realizado > meta_rs * 0.95 && calc.realizado <= meta_rs * 1.05;
        
        const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500';
        const statusColor = isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600';

        return (
          <div key={meta.id} className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{meta.item}</p>
                <p className="text-xs text-gray-500">{meta.responsavel_nome || 'Sem responsável'}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${statusColor}`}>{calc.status}</p>
                <p className="text-xs text-gray-500">{formatNumber(percentual, 0)}%</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: Math.min(percentual, 100) + '%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{formatCurrency(meta_rs)}</span>
              <span>{formatCurrency(calc.realizado || 0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}