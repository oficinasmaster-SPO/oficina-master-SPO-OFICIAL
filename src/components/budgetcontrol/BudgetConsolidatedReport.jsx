import React from "react";
import { formatCurrency, formatNumber } from "../utils/formatters";

function StatusBadge({ ok, warning, label }) {
  if (ok) return <span className="inline-flex items-center gap-1 text-green-300 font-bold text-sm">✅ {label}</span>;
  if (warning) return <span className="inline-flex items-center gap-1 text-yellow-300 font-bold text-sm">⚠️ {label}</span>;
  return <span className="inline-flex items-center gap-1 text-red-300 font-bold text-sm">❌ {label}</span>;
}

export default function BudgetConsolidatedReport({ calculado }) {
  const { receita, despesa } = calculado;

  const temReceita = (receita?.meta || 0) > 0;
  const temDespesa = (despesa?.meta || 0) > 0;

  if (!temReceita && !temDespesa) return null;

  // --- Receita ---
  const atgReceita = receita?.atingimento ?? null; // %
  const receitaOk   = atgReceita !== null && atgReceita >= 100;
  const receitaWarn = atgReceita !== null && atgReceita >= 80 && atgReceita < 100;
  // receitaBad: atgReceita < 80

  // --- Despesa ---
  const despesaOk   = (despesa?.realizado || 0) <= (despesa?.meta || 0);
  const despesaWarn = !despesaOk && (despesa?.realizado || 0) <= (despesa?.meta || 0) * 1.05;
  // despesaBad: realizado > meta * 1.05

  // --- Resultado ---
  const lucroEstimado = (receita?.realizado || 0) - (despesa?.realizado || 0);
  const lucroMeta     = (receita?.meta || 0) - (despesa?.meta || 0);

  // Eficiência orçamentária = média de:
  //   atingimento receita (0–100+ %) + pct economia despesa (100 se ok, 90 se warn, 70 se bad)
  const receitaPct  = Math.min(atgReceita ?? 0, 100);
  const despesaPct  = despesaOk ? 100 : despesaWarn ? 90 : 70;
  const eficiencia  = temReceita && temDespesa
    ? (receitaPct + despesaPct) / 2
    : temReceita ? receitaPct : despesaPct;

  const gradiente = (receitaOk || atgReceita === null) && despesaOk
    ? "from-emerald-600 to-green-700"
    : receitaWarn || despesaWarn
      ? "from-amber-600 to-orange-600"
      : "from-red-600 to-rose-700";

  return (
    <div className={`rounded-xl bg-gradient-to-r ${gradiente} text-white p-5 mb-2 space-y-4`}>
      <h2 className="text-base font-bold tracking-wide">📋 Relatório Consolidado do Mês</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1 — Receita */}
        {temReceita && (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">📈 Receita</p>

            <div className="flex justify-between text-sm opacity-90">
              <span>Meta</span>
              <span className="font-semibold">{formatCurrency(receita.meta)}</span>
            </div>
            <div className="flex justify-between text-sm opacity-90">
              <span>Realizado</span>
              <span className="font-semibold">{formatCurrency(receita.realizado)}</span>
            </div>

            {/* barra de progresso */}
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${receitaOk ? 'bg-green-300' : receitaWarn ? 'bg-yellow-300' : 'bg-red-300'}`}
                style={{ width: Math.min(atgReceita || 0, 100) + '%' }}
              />
            </div>

            <div className="pt-1">
              <StatusBadge
                ok={receitaOk}
                warning={receitaWarn}
                label={atgReceita !== null
                  ? `${formatNumber(atgReceita, 0)}% atingido`
                  : 'Sem dados'}
              />
            </div>
          </div>
        )}

        {/* Card 2 — Despesa */}
        {temDespesa && (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">📉 Despesa</p>

            <div className="flex justify-between text-sm opacity-90">
              <span>Teto orçado</span>
              <span className="font-semibold">{formatCurrency(despesa.meta)}</span>
            </div>
            <div className="flex justify-between text-sm opacity-90">
              <span>Realizado</span>
              <span className="font-semibold">{formatCurrency(despesa.realizado)}</span>
            </div>

            {/* barra: quanto do teto foi consumido */}
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${despesaOk ? 'bg-green-300' : despesaWarn ? 'bg-yellow-300' : 'bg-red-300'}`}
                style={{ width: Math.min(despesa.meta > 0 ? (despesa.realizado / despesa.meta) * 100 : 0, 100) + '%' }}
              />
            </div>

            <div className="pt-1">
              {(despesa.realizado || 0) === 0 ? (
                <StatusBadge ok={true} warning={false} label="Sem gastos lançados" />
              ) : despesa.economia >= 0 ? (
                <StatusBadge
                  ok={despesaOk}
                  warning={despesaWarn}
                  label={`Economia +${formatCurrency(despesa.economia)}`}
                />
              ) : (
                <StatusBadge
                  ok={false}
                  warning={false}
                  label={`Excesso ${formatCurrency(Math.abs(despesa.economia))}`}
                />
              )}
            </div>
          </div>
        )}

        {/* Card 3 — Resultado Estimado */}
        {temReceita && temDespesa && (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">💡 Resultado Estimado</p>

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
            <div className="text-xs opacity-70 mt-1">
              {formatCurrency(receita.realizado)} − {formatCurrency(despesa.realizado)} = {formatCurrency(lucroEstimado)}
            </div>

            <div className="pt-1 border-t border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-xs opacity-80">Eficiência orçamentária</span>
                <span className={`text-base font-bold ${eficiencia >= 90 ? 'text-green-300' : eficiencia >= 75 ? 'text-yellow-300' : 'text-red-300'}`}>
                  {formatNumber(eficiencia, 0)}%
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${eficiencia >= 90 ? 'bg-green-300' : eficiencia >= 75 ? 'bg-yellow-300' : 'bg-red-300'}`}
                  style={{ width: Math.min(eficiencia, 100) + '%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}