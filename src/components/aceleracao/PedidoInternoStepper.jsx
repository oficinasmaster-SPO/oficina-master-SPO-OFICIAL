import React, { memo, useMemo } from "react";
import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrevious } from "@/hooks/use-previous";

export const PEDIDO_STEPS = [
  { key: "pendente", label: "Pendente" },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "concluido", label: "Concluído" },
];

const CHEVRON_PX = 12;
const CHEVRON = `${CHEVRON_PX}px`;

function getClipPath(isFirst, isLast) {
  if (isFirst && isLast) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  if (isFirst)
    return `polygon(0 0, calc(100% - ${CHEVRON}) 0, 100% 50%, calc(100% - ${CHEVRON}) 100%, 0 100%)`;
  if (isLast)
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${CHEVRON} 50%)`;
  return `polygon(0 0, calc(100% - ${CHEVRON}) 0, 100% 50%, calc(100% - ${CHEVRON}) 100%, 0 100%, ${CHEVRON} 50%)`;
}

const STATUS_CLASS = {
  done: "bg-emerald-600 text-white",
  active: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]",
  future: "bg-slate-100 text-slate-400",
};

const StepperStep = memo(function StepperStep({
  label,
  status,
  isFirst,
  isLast,
  zIndex,
}) {
  const clipPath = useMemo(() => getClipPath(isFirst, isLast), [isFirst, isLast]);

  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden",
        "h-11 px-4 py-2 text-xs font-semibold tracking-wide select-none sm:text-sm transition-all duration-200",
        "hover:-translate-y-[1px] hover:brightness-[1.04]",
        STATUS_CLASS[status]
      )}
      style={{ 
        clipPath, 
        WebkitClipPath: clipPath, 
        zIndex,
        filter: status === "active" ? "drop-shadow(0px 2px 6px rgba(37,99,235,0.4))" : undefined,
        marginLeft: isFirst ? undefined : `-${CHEVRON_PX / 2}px`,
        paddingLeft: isFirst ? "16px" : `${CHEVRON_PX + 12}px`,
        paddingRight: isLast ? "16px" : `${CHEVRON_PX + 12}px`,
      }}
      aria-current={status === "active" ? "step" : undefined}
    >
      {/* Brilho duplo ativado via CSS limpo e otimizado via GPU */}
      {status === "active" && (
        <span aria-hidden className="step-shimmer z-0" />
      )}
      
      {status === "done" && (
        <Check aria-hidden className="mr-1.5 size-4 shrink-0" strokeWidth={3} />
      )}
      
      {status === "active" && (
        <span aria-hidden className="mr-1.5 size-2 shrink-0 rounded-full bg-white animate-pulse z-10" />
      )}
      
      <span className="relative z-10 truncate">{label}</span>
      
      <span className="sr-only">
        {status === "done" ? " (concluído)" : status === "active" ? " (etapa atual)" : ""}
      </span>
    </li>
  );
});

function ProgressBar({ percent }) {
  return (
    <div
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 relative"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Progresso do pedido"
    >
      <div 
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 relative transition-all duration-500" 
        style={{ width: `${percent}%` }} 
      >
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/40 to-transparent blur-[0.5px]" />
      </div>
    </div>
  );
}

export const PedidoInternoStepper = memo(function PedidoInternoStepper({
  pedido,
  className,
}) {
  const status = pedido?.status || "pendente";
  const previousStatus = usePrevious(status);
  const isAnimating = previousStatus !== undefined && previousStatus !== status;

  const currentIndex = Math.max(
    0,
    PEDIDO_STEPS.findIndex((s) => s.key === status)
  );
  
  const percent = ((currentIndex + 1) / PEDIDO_STEPS.length) * 100;

  if (status === "recusado") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm font-semibold text-red-700 shadow-sm",
          className
        )}
        role="status"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-sm">
          <XCircle aria-hidden className="size-4 text-white stroke-[2.5]" />
        </span>
        Pedido Recusado
      </div>
    );
  }

  return (
    <div className={cn("w-full", isAnimating && "animate-pulse", className)}>
      <ol className="flex w-full items-stretch overflow-visible py-1" aria-label="Status do pedido">
        {PEDIDO_STEPS.map((step, idx) => (
          <StepperStep
            key={step.key}
            label={step.label}
            status={idx < currentIndex ? "done" : idx === currentIndex ? "active" : "future"}
            isFirst={idx === 0}
            isLast={idx === PEDIDO_STEPS.length - 1}
            zIndex={idx === currentIndex ? 40 : PEDIDO_STEPS.length - idx}
          />
        ))}
      </ol>
      <ProgressBar percent={percent} />
    </div>
  );
});

export default PedidoInternoStepper;