import React, { memo, useState, useCallback } from "react";
import InfoTooltip from "./ds/InfoTooltip";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

// ==========================================
// 1. CONSTANTES E CORES
// ==========================================
export const METRIC_COLORS = {
  red:    { border: "border-red-200",    hoverBorder: "hover:border-red-400",    text: "text-red-600",    ring: "ring-red-400" },
  orange: { border: "border-orange-200", hoverBorder: "hover:border-orange-400", text: "text-orange-600", ring: "ring-orange-400" },
  green:  { border: "border-green-200",  hoverBorder: "hover:border-green-400",  text: "text-green-600",  ring: "ring-green-400" },
  purple: { border: "border-purple-200", hoverBorder: "hover:border-purple-400", text: "text-purple-600", ring: "ring-purple-400" },
  blue:   { border: "border-blue-200",   hoverBorder: "hover:border-blue-400",   text: "text-blue-600",   ring: "ring-blue-400" },
};

const UI_TEXT = {
  header: "Central Operacional",
  updatedNow: "Atualizado agora",
  allClearTitle: "Excelente!",
  allClearDesc: "Todos os clientes possuem Follow-up ativo. Continue assim.",
  priorityTitle: "Prioridade do momento",
  defaultInsight: "Nenhuma prioridade encontrada no momento.",
  openMetric: "Abrir lista",
  openAction: "Abrir Cockpit",
  recommendedActions: "Ações recomendadas",
  emptyMetrics: "Nenhuma métrica disponível.",
};

// ==========================================
// 2. UTILITÁRIO DE CLASSES CSS (cn)
// ==========================================
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ==========================================
// 3. SKELETON COMPONENT
// ==========================================
function MetricSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 h-full animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-16 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. COMPONENTE DE CARD OTIMIZADO (React.memo)
// ==========================================
const MetricCard = memo(function MetricCard({ metric, isActive, onClick }) {
  const c = METRIC_COLORS[metric.color] || METRIC_COLORS.red;

  return (
    <InfoTooltip content={metric.tooltip}>
      <button
        type="button"
        aria-label={`Abrir lista de ${metric.label}`}
        onClick={() => onClick(metric.spId)}
        className={cn(
          "metric-card group relative w-full text-left p-3 rounded-xl border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden active:scale-[0.98]",
          c.border,
          c.hoverBorder,
          isActive && cn("ring-2", c.ring)
        )}
      >
        <div className="flex items-start justify-between">
          <span className="text-sm leading-none" aria-hidden="true">{metric.emoji}</span>
          {typeof metric.count === "number" && typeof metric.pct === "number" && (
            <span className={cn("text-[9px] font-bold", c.text)}>{metric.pct}%</span>
          )}
        </div>

        <div className="mt-1.5">
          <span className={cn("text-2xl font-extrabold tabular-nums", metric.count > 0 ? "text-gray-900" : "text-gray-300")}>
            {metric.count}
          </span>
        </div>

        <p className="text-[11px] font-semibold text-gray-600 leading-tight mt-0.5">{metric.label}</p>

        {metric.sample?.length > 0 && (
          <p className="text-[9px] text-gray-400 mt-1 truncate leading-tight">
            {metric.sample.join(" · ")}
          </p>
        )}

        <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {UI_TEXT.openMetric} <ArrowRight className="w-2.5 h-2.5" />
        </p>
      </button>
    </InfoTooltip>
  );
});

// ==========================================
// 5. COMPONENTE PRINCIPAL
// ==========================================
export default function SidePanelDashboard({
  metrics = [],
  insight,
  allClear = false,
  actions = [],
  activePill,
  onCardClick,
  onActionClick,
  isLoading = false,
}) {
  const handleCardClick = useCallback((spId) => {
    onCardClick?.(spId);
  }, [onCardClick]);

  if (isLoading) {
    return <MetricSkeleton />;
  }

  return (
    <div 
      className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 h-full overflow-y-auto animate-fadeIn"
      style={{ scrollbarGutter: "stable" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{UI_TEXT.header}</h2>
        <div className="flex items-center gap-1.5">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] text-gray-400">{UI_TEXT.updatedNow}</span>
        </div>
      </div>

      {/* Insight ou Tudo em dia */}
      {allClear ? (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-700">{UI_TEXT.allClearTitle}</p>
            <p className="text-xs text-green-600 leading-snug mt-0.5">
              {UI_TEXT.allClearDesc}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">{UI_TEXT.priorityTitle}</p>
            <p className="text-xs text-gray-700 leading-snug mt-1">
              {insight?.text || UI_TEXT.defaultInsight}
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-1" />

      {/* Grid de Cards */}
      {metrics.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">{UI_TEXT.emptyMetrics}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {metrics.map((m) => (
            <MetricCard
              key={m.id}
              metric={m}
              isActive={activePill === m.spId}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Ações recomendadas */}
      {actions?.length > 0 && !allClear && (
        <div className="space-y-2.5 pt-3 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{UI_TEXT.recommendedActions}</p>
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onActionClick?.(a)}
              className="w-full text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-800 truncate">{a.name}</span>
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                    a.urgency === "Crítica"
                      ? "bg-red-100 text-red-700"
                      : a.urgency === "Alta"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {a.urgency}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{a.reason}</p>
              <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5 group-hover:text-gray-600 transition-colors">
                {UI_TEXT.openAction} <ArrowRight className="w-2.5 h-2.5" />
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}