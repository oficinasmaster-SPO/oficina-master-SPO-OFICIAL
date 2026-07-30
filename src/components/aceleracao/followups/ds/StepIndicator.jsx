import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Canal" },
  { label: "Resultado" },
  { label: "Observações" },
  { label: "Próximos Passos" },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-1">
      {STEPS.map((step, idx) => {
        const num = idx + 1;
        const done = num < currentStep;
        const active = num === currentStep;

        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center gap-1" style={{ flex: "0 0 auto" }}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : active
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-400"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span className={`text-[10px] font-semibold leading-tight text-center max-w-[56px] ${
                active ? "text-gray-900" : done ? "text-emerald-600" : "text-gray-400"
              }`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                num < currentStep ? "bg-emerald-400" : "bg-gray-200"
              }`} style={{ marginBottom: "14px" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
