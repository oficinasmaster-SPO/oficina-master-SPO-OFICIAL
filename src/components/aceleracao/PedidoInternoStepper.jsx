import React from "react";
import { Check, Circle } from "lucide-react";

const STEPS = [
  { key: "pendente",   label: "Pendente"   },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado",   label: "Aprovado"   },
  { key: "concluido",  label: "Concluído"  },
];

export default function PedidoInternoStepper({ pedido }) {
  if (pedido.status === "recusado") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
          <Check className="h-3 w-3 text-white" />
        </span>
        <span className="text-sm font-semibold text-red-700">Pedido Recusado</span>
      </div>
    );
  }

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === pedido.status));
  const totalSteps = STEPS.length;

  // Progress bar percentages
  const donePercent   = (currentIndex / totalSteps) * 100;
  const activePercent = (1 / totalSteps) * 100;
  const futurePercent = 100 - donePercent - activePercent;

  return (
    <div className="w-full">
      {/* Chevron steps */}
      <div className="flex items-stretch" style={{ height: "40px" }}>
        {STEPS.map((step, idx) => {
          const isDone   = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isFirst  = idx === 0;
          const isLast   = idx === totalSteps - 1;

          // Background and text colors
          let bgColor, textColor;
          if (isDone) {
            bgColor  = "#22c55e"; // green-500
            textColor = "#ffffff";
          } else if (isActive) {
            bgColor  = "#3b82f6"; // blue-500
            textColor = "#ffffff";
          } else {
            bgColor  = "#e5e7eb"; // gray-200
            textColor = "#9ca3af"; // gray-400
          }

          // Clip-path for chevron shape:
          // - First step: flat left edge, pointed right edge
          // - Middle steps: indented left edge (inverse V), pointed right edge
          // - Last step: indented left edge, flat right edge
          const chevronDepth = "12px";
          let clipPath;
          if (isFirst && isLast) {
            clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
          } else if (isFirst) {
            clipPath = `polygon(0 0, calc(100% - ${chevronDepth}) 0, 100% 50%, calc(100% - ${chevronDepth}) 100%, 0 100%)`;
          } else if (isLast) {
            clipPath = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${chevronDepth} 50%)`;
          } else {
            clipPath = `polygon(0 0, calc(100% - ${chevronDepth}) 0, 100% 50%, calc(100% - ${chevronDepth}) 100%, 0 100%, ${chevronDepth} 50%)`;
          }

          return (
            <div
              key={step.key}
              className="relative flex items-center justify-center gap-1.5 text-xs font-semibold select-none"
              style={{
                flex: 1,
                backgroundColor: bgColor,
                color: textColor,
                clipPath,
                paddingLeft: isFirst ? "12px" : "20px",
                paddingRight: isLast ? "12px" : "20px",
                marginLeft: isFirst ? 0 : "-6px",
                zIndex: totalSteps - idx,
              }}
            >
              {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
              {isActive && <Circle className="h-3.5 w-3.5 shrink-0 animate-pulse" />}
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Thin progress bar underneath */}
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        {donePercent > 0 && (
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${donePercent}%` }}
          />
        )}
        {activePercent > 0 && (
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${activePercent}%` }}
          />
        )}
        {futurePercent > 0 && (
          <div
            className="bg-gray-200 transition-all duration-300"
            style={{ width: `${futurePercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
