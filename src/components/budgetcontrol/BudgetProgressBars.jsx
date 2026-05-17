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
        
        const isDespesa = meta.tipo === "despesa";
        const percentual = meta_rs > 0 ? (calc.realizado / meta_rs) * 100 : 0;
        const isOver = calc.realizado > meta_rs * 1.05;
        const isWarning = calc.realizado > meta_rs * 0.95 && calc.realizado <= meta_rs * 1.05;
        
        // Para despesa: verde = abaixo da meta (bom). Para receita: verde = acima da meta (bom)
        const barColor = isDespesa
          ? (isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500')
          : (percentual >= 100 ? 'bg-green-500' : percentual >= 80 ? 'bg-yellow-500' : 'bg-red-500');
        const statusColor = isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600';

        return (
          <div key={meta.id} className={`p-3 rounded-lg border ${isDespesa ? 'border-red-100 bg-red-50/40' : 'border-green-100 bg-green-50/40'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${isDespesa ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {isDespesa ? '↑ Despesa' : '↓ Receita'}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{meta.item}</p>
                  <p className="text-xs text-gray-500">{meta.categoria} · {meta.responsavel_nome || 'Sem responsável'}</p>
                </div>
              </div>
              <div className="text-right ml-2">
                <p className={`text-sm font-bold ${statusColor}`}>{calc.status}</p>
                <p className="text-xs text-gray-500">{formatNumber(percentual, 0)}% da meta</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: Math.min(percentual, 100) + '%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Meta: <strong>{formatCurrency(meta_rs)}</strong></span>
              <span>Real: <strong>{formatCurrency(calc.realizado || 0)}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}