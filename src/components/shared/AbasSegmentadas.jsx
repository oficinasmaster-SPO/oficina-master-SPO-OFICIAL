import React from "react";
import { cn } from "@/lib/utils";

/**
 * AbasSegmentadas — sub-navegação padrão dos módulos financeiros (DRE, DFC, Orçamento).
 *
 * Substitui as várias implementações anteriores (botões soltos com emoji).
 * Ícones monocromáticos (lucide), estado ativo com fundo branco + borda sutil,
 * valor auxiliar opcional em dígitos tabulares (ex.: total da aba).
 *
 * Props
 *   abas      [{ value, label, icon?, detalhe?, tom? }]
 *               icon    — componente lucide (ex.: TrendingUp)
 *               detalhe — texto auxiliar à direita do rótulo (ex.: "R$ 63.983,32" ou "68")
 *               tom     — "positivo" | "negativo" | undefined (cor do detalhe)
 *   valor     value da aba ativa
 *   onChange  (value) => void — nunca é chamado com a aba já ativa nem com vazio
 *   tamanho   "sm" | "md" (padrão)
 *   largura   "auto" (padrão) | "total" — ocupa a largura do container, abas dividem o espaço
 *   ariaLabel rótulo acessível do grupo
 */
export default function AbasSegmentadas({
  abas = [],
  valor,
  onChange,
  tamanho = "md",
  largura = "auto",
  ariaLabel,
  className,
}) {
  return (
    <div className={cn("max-w-full overflow-x-auto", largura === "total" && "w-full", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-stretch gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1",
          largura === "total" && "flex w-full min-w-max"
        )}
      >
        {abas.map(({ value, label, icon: Icon, detalhe, tom }) => {
          const ativo = valor === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => { if (!ativo && value) onChange?.(value); }}
              className={cn(
                "flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                tamanho === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                largura === "total" && "flex-1",
                ativo
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
              )}
            >
              {Icon && (
                <Icon className={cn(tamanho === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", ativo ? "text-blue-600" : "text-slate-400")} />
              )}
              <span>{label}</span>
              {detalhe != null && detalhe !== "" && (
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    tamanho === "sm" ? "text-[11px]" : "text-xs",
                    tom === "positivo" ? "text-emerald-600" : tom === "negativo" ? "text-red-600" : "text-slate-400"
                  )}
                >
                  {detalhe}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
