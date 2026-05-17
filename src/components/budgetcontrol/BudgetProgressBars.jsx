import React from "react";
import { formatCurrency, formatNumber } from "../utils/formatters";

export default function BudgetProgressBars({ metas, calculado }) {
  if (!metas.length) return null;

  // Filtrar itens com controlar_orcamento !== false
  const metasAtivas = metas.filter(m => m.controlar_orcamento !== false);
  if (!metasAtivas.length) return null;

  return (
    <div className="space-y-4">
      {metasAtivas.map(meta => {
        const calc = calculado.por_categoria[meta.id] || {};
        const meta_rs = calc.meta_rs || 0;
        const isDespesa = meta.tipo !== "receita";

        // Para despesa: barra mostra quanto do teto foi consumido (realizado/meta)
        // Para receita: barra mostra atingimento (realizado/meta)
        const percentualBarra = meta_rs > 0 ? Math.min((calc.realizado / meta_rs) * 100, 100) : 0;

        // Cor da barra baseada no status calculado pela engine
        let barColor;
        if (calc.status === "✅") barColor = "bg-green-500";
        else if (calc.status === "⚠️") barColor = "bg-yellow-500";
        else barColor = "bg-red-500";

        const statusColorMap = { "✅": "text-green-600", "⚠️": "text-yellow-600", "❌": "text-red-600" };
        const statusColor = statusColorMap[calc.status] || "text-gray-500";

        // Label contextual de variação
        const variacaoLabel = isDespesa
          ? (calc.diferenca >= 0 ? `Economia: +${formatCurrency(calc.diferenca)}` : `Excesso: ${formatCurrency(Math.abs(calc.diferenca))}`)
          : (calc.diferenca >= 0 ? `Acima: +${formatCurrency(calc.diferenca)}` : `Abaixo: ${formatCurrency(Math.abs(calc.diferenca))}`);

        return (
          <div key={meta.id} className={`p-3 rounded-lg border ${isDespesa ? 'border-red-100 bg-red-50/40' : 'border-green-100 bg-green-50/40'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${isDespesa ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {isDespesa ? '📉 Despesa' : '📈 Receita'}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{meta.item}</p>
                  <p className="text-xs text-gray-500">{meta.categoria} · {meta.responsavel_nome || 'Sem responsável'}</p>
                </div>
              </div>
              <div className="text-right ml-2">
                <p className={`text-lg leading-none`}>{calc.status}</p>
                <p className={`text-xs font-semibold ${statusColor}`}>
                  {isDespesa ? `${formatNumber(Math.min((calc.realizado / meta_rs) * 100, 150), 0)}% do teto` : `${formatNumber((calc.realizado / meta_rs) * 100, 0)}% atingido`}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: percentualBarra + '%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{isDespesa ? 'Teto' : 'Meta'}: <strong>{formatCurrency(meta_rs)}</strong></span>
              <span className={`font-semibold ${statusColor}`}>{variacaoLabel}</span>
              <span>Real: <strong>{formatCurrency(calc.realizado || 0)}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}