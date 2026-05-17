import React from "react";
import { formatCurrency, formatNumber } from "../utils/formatters";

function StatusBadge({ ok, warning, label }) {
  if (ok) return <span className="text-green-400 font-bold text-lg">✅ {label}</span>;
  if (warning) return <span className="text-yellow-300 font-bold text-lg">⚠️ {label}</span>;
  return <span className="text-red-300 font-bold text-lg">❌ {label}</span>;
}

export default function BudgetConsolidatedReport({ calculado }) {
  const { receita, despesa } = calculado;

  const temReceita = receita?.meta > 0;
  const temDespesa = despesa?.meta > 0;

  if (!temReceita && !temDespesa) return null;

  // Status Receita
  const atgReceita = receita?.atingimento ?? null;
  const receitaOk = atgReceita !== null && atgReceita >= 100;
  const receitaWarn = atgReceita !== null && atgReceita >= 80 && atgReceita < 100;

  // Status Despesa
  const despesaOk = despesa?.realizado <= despesa?.meta;
  const despesaWarn = despesa?.realizado <= despesa?.meta * 1.05 && despesa?.realizado > despesa?.meta;

  // Resultado estimado
  const lucroEstimado = (receita?.realizado || 0) - (despesa?.realizado || 0);
  const lucroMeta = (receita?.meta || 0) - (despesa?.meta || 0);
  const eficienciaOrcamentaria = temReceita && temDespesa
    ? (((atgReceita || 0) + (despesaOk ? 100 : despesaWarn ? 90 : 70)) / 2)
    : null;

  const headerColor = receitaOk && despesaOk
    ? "from-emerald-600 to-green-700"
    : (!receitaOk || !despesaOk) && !receitaWarn && !despesaWarn
      ? "from-red-600 to-rose-700"
      : "from-amber-600 to-orange-600";

  return (
    <div className={`rounded-xl bg-gradient-to-r ${headerColor} text-white p-5 mb-6 space-y-4`}>
      <h2 className="text-lg font-bold">📋 Relatório Consolidado do Mês</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card Receita */}
        {temReceita && (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-2">
            <p className="text-xs font-semibold uppercase opacity-80 mb-1">📈 Receita</p>
            <div className="flex justify-between text-sm opacity-90">
              <span>Meta planejada</span>
              <span className="font-semibold">{formatCurrency(receita.meta)}</span>
            </div>
            <div className="flex justify-between text-sm opacity-90">
              <span>Realizado</span>
              <span className="font-semibold">{formatCurrency(receita.realizado)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
              <div
                className={`h-full rounded-full ${receitaOk ? 'bg-green-300' : receitaWarn ? 'bg-yellow-300' : 'bg-red-300'}`}
                style={{ width: Math.min(atgReceita || 0, 100) + '%' }}
              />
            </div>
            <div className="pt-1">
              <StatusBadge
                ok={receitaOk}
                warning={receitaWarn}
                label={`${formatNumber(atgReceita || 0, 0)}% atingido`}
              />
            </div>
          </div>
        )}

        {/* Card Despesa */}
        {temDespesa && (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-2">
            <p className="text-xs font-semibold uppercase opacity-80 mb-1">📉 Despesa</p>
            <div className="flex justify-between text-sm opacity-90">
              <span>Teto orçado</span>
              <span className="font-semibold">{formatCurrency(despesa.meta)}</span>
            </div>
            <div className="flex justify-between text-sm opacity-90">
              <span>Realizado</span>
              <span className="font-semibold">{formatCurrency(despesa.realizado)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
              <div
                className={`h-full rounded-full ${despesaOk ? 'bg-green-300' : despesaWarn ? 'bg-yellow-300' : 'bg-red-300'}`}
                style={{ width: Math.min((despesa.realizado / despesa.meta) * 100, 100) + '%' }}
              />
            </div>
            <div className="pt-1">
              {despesa.economia >= 0 ? (
                <StatusBadge ok={true} label={`Economia de ${formatCurrency(despesa.economia)}`} />
              ) : (
                <StatusBadge ok={false} warning={false} label={`Excesso de ${formatCurrency(Math.abs(despesa.economia))}`} />
              )}
            </div>
          </div>
        )}

        {/* Card Resultado */}
        {temReceita && temDespesa && (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-2">
            <p className="text-xs font-semibold uppercase opacity-80 mb-1">💡 Resultado Estimado</p>
            <div className="flex justify-between text-sm opacity-90">
              <span>Margem planejada</span>
              <span className="font-semibold">{formatCurrency(lucroMeta)}</span>
            </div>
            <div className="flex justify-between text-sm opacity-90">
              <span>Margem realizada</span>
              <span className={`font-semibold ${lucroEstimado >= lucroMeta ? 'text-green-200' : 'text-red-200'}`}>
                {formatCurrency(lucroEstimado)}
              </span>
            </div>
            {eficienciaOrcamentaria !== null && (
              <div className="flex justify-between text-sm opacity-90 pt-1 border-t border-white/20">
                <span>Eficiência orçamentária</span>
                <span className="font-bold">{formatNumber(eficienciaOrcamentaria, 0)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}