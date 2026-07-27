import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { key: "pendente",   label: "Pendente"   },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado",   label: "Aprovado"   },
  { key: "concluido",  label: "Concluído"  },
];

export default function PedidoInternoStepper({ pedido }) {
  if (pedido.status === "recusado") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
          <Check className="h-3 w-3 text-white" />
        </span>
        <span className="text-sm font-semibold text-red-700">Pedido Recusado</span>
      </div>
    );
  }

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === pedido.status));

  return (
    <div className="flex items-stretch h-9">
      {STEPS.map((step, idx) => {
        const isDone   = idx < currentIndex;
        const isActive = idx === currentIndex;

        const bg = isDone
          ? "bg-green-500 text-white"
          : isActive
          ? "bg-blue-500 text-white"
          : "bg-gray-100 text-gray-400";

        const arrow = isDone
          ? "text-green-500"
          : isActive
          ? "text-blue-500"
          : "text-gray-100";

        const isFirst = idx === 0;
        const isLast  = idx === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-stretch">
            <div
              className={`
                relative flex items-center gap-1.5 px-4 text-xs font-semibold select-none
                ${bg}
                ${isFirst ? "rounded-l-md" : ""}
                ${isLast  ? "rounded-r-md" : ""}
              `}
            >
              {isDone && <Check className="h-3.5 w-3.5" />}
              {step.label}
            </div>
            {!isLast && (
              <svg width="12" height="36" viewBox="0 0 12 36" className="shrink-0" style={{ display: "block" }}>
                <polygon
                  points="0,0 12,18 0,36"
                  className={`fill-current ${arrow}`}
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
