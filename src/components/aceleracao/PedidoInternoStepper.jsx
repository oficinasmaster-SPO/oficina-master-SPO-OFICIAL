import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { key: "pendente", label: "Pendente" },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "concluido", label: "Concluído" },
];

export default function PedidoInternoStepper({ status }) {
  if (status === "recusado") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-700">Pedido Recusado</span>
      </div>
    );
  }

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === status));

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-blue-500 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  isDone || isActive ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded-full ${
                  isDone ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}