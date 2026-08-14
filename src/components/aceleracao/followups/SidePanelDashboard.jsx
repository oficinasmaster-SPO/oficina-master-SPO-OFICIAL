import React from "react";
import InfoTooltip from "./ds/InfoTooltip";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

const COLOR_MAP = {
  red:    { border: "border-red-200",    hoverBorder: "hover:border-red-400",    text: "text-red-600",    ring: "ring-red-400" },
  orange: { border: "border-orange-200", hoverBorder: "hover:border-orange-400", text: "text-orange-600", ring: "ring-orange-400" },
  green:  { border: "border-green-200",  hoverBorder: "hover:border-green-400",  text: "text-green-600",  ring: "ring-green-400" },
  purple: { border: "border-purple-200", hoverBorder: "hover:border-purple-400", text: "text-purple-600", ring: "ring-purple-400" },
  blue:   { border: "border-blue-200",   hoverBorder: "hover:border-blue-400",   text: "text-blue-600",   ring: "ring-blue-400" },
};

function triggerRipple(e) {
  const btn = e.currentTarget;
  if (!btn) return;
  const circle = document.createElement("span");
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;
  const rect = btn.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.className = "metric-ripple";
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

function MetricCard({ metric, isActive, onClick }) {
  const c = COLOR_MAP[metric.color] || COLOR_MAP.red;
  return (
    <InfoTooltip content={metric.tooltip}>
      <button
        onClick={(e) => { triggerRipple(e); onClick(); }}
        className={`metric-card group relative w-full text-left p-3 rounded-xl border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${c.border} ${c.hoverBorder} ${isActive ? `ring-2 ${c.ring}` : ""}`}
      >
        <div className="flex items-start justify-between">
          <span className="text-sm leading-none">{metric.emoji}</span>
          {metric.count > 0 && metric.pct > 0 && (
            <span className={`text-[9px] font-bold ${c.text}`}>{metric.pct}%</span>
          )}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className={`text-2xl font-extrabold tabular-nums ${metric.count > 0 ? "text-gray-900" : "text-gray-300"}`}>
            {metric.count}
          </span>
          {metric.trend && (
            <span className={`text-[10px] font-bold ${
              metric.trend.goodWhenUp === (metric.trend.direction === "up")
                ? "text-green-600" : "text-red-500"
            }`}>
              {metric.trend.direction === "up" ? "↑" : "↓"} {Math.abs(metric.trend.delta)}
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-gray-600 leading-tight mt-0.5">{metric.label}</p>
        {metric.count > 0 && metric.sample.length > 0 && (
          <p className="text-[9px] text-gray-400 mt-1 truncate leading-tight">
            {metric.sample.join(" · ")}
          </p>
        )}
        <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          Abrir lista <ArrowRight className="w-2.5 h-2.5" />
        </p>
      </button>
    </InfoTooltip>
  );
}

const PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
];

export default function SidePanelDashboard({ metrics, insight, allClear, actions, activePill, onCardClick, onActionClick, period = "today", onPeriodChange, coverage = null }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3.5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">Central Operacional</h2>
        <div className="flex items-center gap-1.5">
          {period === "today" ? (
            <>
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-gray-400">Atualizado agora</span>
            </>
          ) : (
            <span className="text-[10px] text-gray-400 font-medium">
              {period === "week" ? "Acumulado · sem" : "Acumulado · mês"}
            </span>
          )}
        </div>
      </div>

      {/* Toggle de período — estilo iPhone aprimorado */}
<div className="relative flex items-center p-1 bg-gray-100 rounded-xl overflow-hidden w-full">
  {/* Slider vermelho */}
  <div
    className="absolute top-1 bottom-1 left-1 rounded-lg bg-[#f00000] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
    style={{
      width: `calc((100% - 8px) / ${PERIOD_OPTIONS.length})`,
      transform: `translateX(calc(${PERIOD_OPTIONS.findIndex(
        opt => opt.id === period
      )} * 100%))`,
    }}
  />

  {/* Opções */}
  {PERIOD_OPTIONS.map(opt => {
    const isActive = period === opt.id;

    return (
      <button
        key={opt.id}
        onClick={() => onPeriodChange?.(opt.id)}
        className={`
          relative z-10 flex-1
          py-1.5 px-2
          text-xs font-bold
          rounded-lg
          transition-all duration-200
          ease-out
          select-none
          active:scale-[0.96]
          ${isActive
            ? "text-white scale-[1.02]"
            : "text-gray-500 hover:text-gray-800"}
        `}
      >
        <span
          className={`
            inline-block
            transition-transform duration-200
            ${isActive ? "scale-[1.03]" : "scale-100"}
          `}
        >
          {opt.label}
        </span>
      </button>
    );
  })}
</div>

      {/* Insight ou Tudo em dia */}
      {allClear ? (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-700">Excelente!</p>
            <p className="text-xs text-green-600 leading-snug mt-0.5">
              {period === "today"
                ? "Todos os clientes possuem Follow-up ativo. Continue assim."
                : period === "week"
                ? "Semana produtiva — sem pendências em aberto."
                : "Mês produtivo — sem pendências em aberto."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
              {period === "today" ? "Prioridade do momento" : "Resumo da " + (period === "week" ? "semana" : "mês")}
            </p>
            <p className="text-xs text-gray-700 leading-snug mt-1">{insight?.text}</p>
          </div>
        </div>
      )}

      {/* Barra de cobertura da carteira (apenas Semana/Mês) */}
      {period !== "today" && coverage != null && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cobertura da carteira</span>
            <span className="text-xs font-extrabold text-gray-900 tabular-nums">{coverage}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(coverage, 100)}%`, background: coverage >= 80 ? "#22c55e" : coverage >= 50 ? "#f59e0b" : "#ef4444" }}
            />
          </div>
        </div>
      )}

      {/* Grid 2×3 de cards — re-anima ao trocar período */}
      <div key={period} className="grid grid-cols-2 gap-2.5 cockpit-enter">
        {metrics.map(m => (
          <MetricCard
            key={m.id}
            metric={m}
            isActive={activePill === m.spId}
            onClick={() => onCardClick?.(m.spId)}
          />
        ))}
      </div>

      {/* Ações recomendadas */}
      {actions && actions.length > 0 && !allClear && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Ações recomendadas</p>
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => onActionClick?.(a)}
              className="w-full text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-800 truncate">{a.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  a.urgency === "Crítica" ? "bg-red-100 text-red-700" :
                  a.urgency === "Alta" ? "bg-orange-100 text-orange-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{a.urgency}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{a.reason}</p>
              <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5 group-hover:text-gray-600 transition-colors">
                Abrir Cockpit <ArrowRight className="w-2.5 h-2.5" />
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}