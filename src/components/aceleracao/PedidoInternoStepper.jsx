import { memo, useMemo } from "react";
import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrevious } from "@/hooks/use-previous";

export const PEDIDO_STEPS = [
  { key: "pendente", label: "Pendente" },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "concluido", label: "Concluído" },
] as const;

export type PedidoStepKey = (typeof PEDIDO_STEPS)[number]["key"];
export type PedidoStatus = PedidoStepKey | "recusado";

type StepStatus = "done" | "active" | "future";

// Mantemos em pixels exatos para facilitar os cálculos de padding e margem
const CHEVRON_PX = 12;
const CHEVRON = `${CHEVRON_PX}px`;

function getClipPath(isFirst: boolean, isLast: boolean) {
  if (isFirst && isLast) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  if (isFirst)
    return `polygon(0 0, calc(100% - ${CHEVRON}) 0, 100% 50%, calc(100% - ${CHEVRON}) 100%, 0 100%)`;
  if (isLast)
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${CHEVRON} 50%)`;
  return `polygon(0 0, calc(100% - ${CHEVRON}) 0, 100% 50%, calc(100% - ${CHEVRON}) 100%, 0 100%, ${CHEVRON} 50%)`;
}

/** Presentation is fully token-driven: each status just picks a CSS class. */
const STATUS_CLASS: Record<StepStatus, string> = {
  done: "step-chip--done",
  active: "step-chip--active",
  future: "step-chip--future",
};

interface StepProps {
  label: string;
  status: StepStatus;
  isFirst: boolean;
  isLast: boolean;
  zIndex: number;
}

const StepperStep = memo(function StepperStep({
  label,
  status,
  isFirst,
  isLast,
  zIndex,
}: StepProps) {
  const clipPath = useMemo(() => getClipPath(isFirst, isLast), [isFirst, isLast]);

  return (
    <li
      className={cn(
        "step-chip relative flex min-w-0 flex-1 items-center justify-center overflow-hidden",
        "h-11 px-4 py-2 text-xs font-semibold tracking-wide select-none sm:text-sm transition-all",
        "hover:-translate-y-[1px] hover:brightness-[1.04]", // Efeito tátil
        STATUS_CLASS[status]
      )}
      style={{ 
        clipPath, 
        WebkitClipPath: clipPath, 
        zIndex,
        // Geometria: O margin negativo puxa a aba para "dentro" do recorte da anterior
        marginLeft: isFirst ? undefined : `-${CHEVRON_PX / 2}px`,
        // Geometria: O padding evita que o texto encoste no corte diagonal
        paddingLeft: isFirst ? "16px" : `${CHEVRON_PX + 12}px`,
        paddingRight: isLast ? "16px" : `${CHEVRON_PX + 12}px`,
      } as React.CSSProperties} // Cast para evitar erros de tipagem no WebkitClipPath
      aria-current={status === "active" ? "step" : undefined}
    >
      {status === "active" && <span aria-hidden className="step-shimmer" />}
      {status === "done" && (
        <Check aria-hidden className="step-check mr-1.5 size-4 shrink-0" strokeWidth={3} />
      )}
      {status === "active" && <span aria-hidden className="step-luma mr-1.5 size-2 rounded-full" />}
      <span className="relative z-10 truncate">{label}</span>
      <span className="sr-only">
        {status === "done" ? " (concluído)" : status === "active" ? " (etapa atual)" : ""}
      </span>
    </li>
  );
});

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="step-track mt-3 h-1.5 w-full overflow-hidden rounded-full relative"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Progresso do pedido"
    >
      <div 
        className="step-track-fill h-full rounded-full relative" 
        style={{ width: `${percent}%` }} 
      >
        {/* Efeito de brilho na ponta estilo MacOS */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/70 to-transparent blur-[0.5px]" />
      </div>
    </div>
  );
}

export interface PedidoInternoStepperProps {
  status: PedidoStatus;
  className?: string;
}

export const PedidoInternoStepper = memo(function PedidoInternoStepper({
  status,
  className,
}: PedidoInternoStepperProps) {
  const previousStatus = usePrevious(status);
  
  // Só aplica a classe animada se o status mudar ENQUANTO o drawer estiver aberto.
  const isAnimating = previousStatus !== undefined && previousStatus !== status;

  const currentIndex = Math.max(
    0,
    PEDIDO_STEPS.findIndex((s) => s.key === status),
  );
  
  const percent = ((currentIndex + 1) / PEDIDO_STEPS.length) * 100;

  if (status === "recusado") {
    return (
      <div
        className={cn(
          "step-chip--rejected flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm",
          className,
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
    <div className={cn("stepper-container w-full", isAnimating && "is-animating", className)}>
      {/* Removido o gap-px (substituído pela lógica do margin negativo) */}
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