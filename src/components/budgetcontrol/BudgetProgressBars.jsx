import React from "react";
import { formatCurrency, formatNumber } from "../utils/formatters";

export default function BudgetProgressBars({ metas, calculado }) {
  // Filtrar metas sem controle orçamentário (cenário 6)
  const metasAtivas = metas.filter(m => m.controlar_orcamento !== false);
  if (!metasAtivas.length) return null;

  return (
    <div className="space-y-4">
      {metasAtivas.map(meta => {
        const calc = calculado.por_categoria[meta.id] || {};
        const meta_rs = meta.meta_percentual
          ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
          : (meta.meta_fixa_rs || 0);

        // Cenário 5: sem meta configurada
        if (!meta_rs) {
          return (
            <div key={meta.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{meta.item}</p>
                <p className="text-xs text-gray-400">{meta.categoria}</p>
              </div>
              <span className="text-xs text-gray-400 italic">SEM META</span>
            </div>
          );
        }

        const isDespesa = meta.tipo !== "receita";
        const realizado = calc.realizado || 0;
        const previsto = calc.previsto || 0;
        const pctRealizado = Math.min((realizado / meta_rs) * 100, 100);
        const pctPrevisto = Math.min((previsto / meta_rs) * 100, 100);

        const statusOk   = calc.status === "✅";
        const statusWarn = calc.status === "⚠️";
        const barColor = statusOk ? 'bg-green-500' : statusWarn ? 'bg-yellow-500' : 'bg-red-500';
        const statusColor = statusOk ? 'text-green-600' : statusWarn ? 'text-yellow-600' : 'text-red-600';

        const variacaoTexto = isDespesa
          ? (calc.variacao >= 0 ? `+${formatNumber(calc.variacao, 0)}% econ.` : `${formatNumber(calc.variacao, 0)}% excesso`)
          : (calc.variacao >= 0 ? `+${formatNumber(calc.variacao, 0)}% acima` : `${formatNumber(calc.variacao, 0)}% abaixo`);

        return (
          <div key={meta.id} className={`p-3 rounded-lg border ${isDespesa ? 'border-red-100 bg-red-50/40' : 'border-green-100 bg-green-50/40'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${isDespesa ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {isDespesa ? '↑ Despesa' : '↑ Receita'}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{meta.item}</p>
                  <p className="text-xs text-gray-500">{meta.categoria} · {meta.responsavel_nome || 'Sem responsável'}</p>
                </div>
              </div>
              <div className="text-right ml-2">
                <p className={`text-sm font-bold ${statusColor}`}>{calc.status}</p>
                <p className="text-xs text-gray-500">{variacaoTexto}</p>
              </div>
            </div>

            {/* Barra previsto (DRE - fundo cinza) */}
            <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-1">
              <div
                className="absolute h-full rounded-full bg-gray-400 transition-all"
                style={{ width: pctPrevisto + '%' }}
                title={`Previsto (DRE): ${formatCurrency(previsto)}`}
              />
              {/* Barra realizado (pago) por cima */}
              <div
                className={`absolute h-full rounded-full transition-all ${barColor}`}
                style={{ width: pctRealizado + '%' }}
                title={`Realizado (Pago): ${formatCurrency(realizado)}`}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{isDespesa ? 'Teto' : 'Meta'}: <strong>{formatCurrency(meta_rs)}</strong></span>
              <span className="flex gap-3">
                <span className="text-gray-400">Prev: {formatCurrency(previsto)}</span>
                <span className="text-blue-700 font-semibold">Pago: {formatCurrency(realizado)}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}