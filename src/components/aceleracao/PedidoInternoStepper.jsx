import React, { useMemo, useEffect, useRef } from "react";
import { Check, XCircle } from "lucide-react";

// ============================================================================
// HOOKS E UTILS
// ============================================================================
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const STEPS = [
  { key: "pendente", label: "Pendente" },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "concluido", label: "Concluído" },
];

const getClipPath = (isFirst, isLast, chevronDepth = "12px") => {
  if (isFirst && isLast) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  if (isFirst) return `polygon(0 0, calc(100% - ${chevronDepth}) 0, 100% 50%, calc(100% - ${chevronDepth}) 100%, 0 100%)`;
  if (isLast) return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${chevronDepth} 50%)`;
  return `polygon(0 0, calc(100% - ${chevronDepth}) 0, 100% 50%, calc(100% - ${chevronDepth}) 100%, 0 100%, ${chevronDepth} 50%)`;
};

// ============================================================================
// CONFIGURAÇÃO DE ESTILOS E COREOGRAFIA (Frozen & CSS Variables)
// ============================================================================
const STYLE_MAP = Object.freeze({
  done: Object.freeze({
    background: "linear-gradient(180deg, #4ade80 0%, #22c55e 100%)",
    color: "#ffffff",
    boxShadow: "inset 0 1px rgba(255, 255, 255, 0.45), inset 0 -2px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
    animClass: "step-anim-done",
  }),
  active: Object.freeze({
    background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
    color: "#ffffff",
    boxShadow: "inset 0 1px rgba(255, 255, 255, 0.5), inset 0 -2px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(37, 99, 235, 0.4), 0 0 2px rgba(59, 130, 246, 0.6), 0 0 8px rgba(59, 130, 246, 0.35), 0 4px 8px rgba(37, 99, 235, 0.20)",
    animClass: "step-anim-active",
  }),
  future: Object.freeze({
    background: "linear-gradient(180deg, #f3f4f6 0%, #d1d5db 100%)",
    color: "#6b7280",
    boxShadow: "inset 0 1px rgba(255, 255, 255, 0.6), inset 0 -1px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
    animClass: "step-anim-future",
  }),
});

const CSS_CHOREOGRAPHY = `
  .stepper-container {
    /* Centralizando as variáveis de orquestração */
    --step-duration: 0.5s;
    --step-delay-bar: 0.1s;
    --step-delay-glow: 0.5s;
    --step-delay-pop: 0.8s;
    --step-delay-shimmer: 1s;
  }

  /* --------------------------------------------------------
   * 1. TRANSIÇÕES DE ESTADO (Apenas rodam se .is-animating)
   * -------------------------------------------------------- */
  .is-animating .step-anim-done,
  .is-animating .step-anim-future {
    transition: background 0.4s ease, box-shadow 0.3s ease, color 0.3s ease;
  }
  
  .is-animating .step-anim-active {
    transition: 
      background var(--step-duration) ease, 
      box-shadow calc(var(--step-duration) + 0.1s) ease var(--step-delay-glow), 
      color 0.3s ease 0.3s;
  }

  .is-animating .progress-bar-anim {
    transition: width calc(var(--step-duration) + 0.1s) ease-in-out var(--step-delay-bar);
  }

  /* --------------------------------------------------------
   * 2. ANIMAÇÕES (Check, Shimmer e Luma)
   * -------------------------------------------------------- */
  @keyframes check-pop-rotate {
    0% { transform: scale(0.3) rotate(8deg); opacity: 0; }
    50% { transform: scale(1.1) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  
  .animate-check-pop {
    /* Estado visual final forçado para quando não há animação */
    transform: scale(1) rotate(0deg); 
    opacity: 1;
  }
  .is-animating .animate-check-pop {
    animation: check-pop-rotate 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) var(--step-delay-pop) both;
  }

  @keyframes shimmer-glass {
    0% { left: -20%; }
    15% { left: 120%; }
    100% { left: 120%; }
  }
  
  .animate-shimmer-glass {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 18px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 30%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0.15) 70%, transparent 100%);
    transform: skewX(-15deg);
    /* Inicia o loop infinito instantaneamente (0s) se for state inicial */
    animation: shimmer-glass 5s cubic-bezier(0.4, 0, 0.6, 1) 0s infinite;
  }
  .is-animating .animate-shimmer-glass {
    /* Aguarda o delay coreografado para o primeiro flash */
    animation-delay: var(--step-delay-shimmer);
  }

  @keyframes pulse-luma {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
  .animate-pulse-luma {
    animation: pulse-luma 3s ease-in-out infinite;
  }
`;

// ============================================================================
// COMPONENTE: PASSO INDIVIDUAL (Memoizado e Previsível)
// ============================================================================
/**
 * Agora recebe `status` explícito ("done", "active", "future")
 * em vez de índices numéricos que mudam, maximizando o React.memo.
 */
const StepperStep = React.memo(function StepperStep({ step, status, isFirst, isLast, zIndex }) {
  const currentStyle = STYLE_MAP[status];
  const clipPath = useMemo(() => getClipPath(isFirst, isLast), [isFirst, isLast]);

  return (
    <div
      className={`relative flex-1 items-center justify-center gap-2 h-[46px] flex text-xs font-semibold select-none hover:-translate-y-[1px] hover:brightness-[1.04] ${currentStyle.animClass}`}
      style={{
        background: currentStyle.background,
        color: currentStyle.color,
        boxShadow: currentStyle.boxShadow,
        clipPath,
        paddingLeft: isFirst ? "14px" : "22px",
        paddingRight: isLast ? "14px" : "22px",
        marginLeft: isFirst ? 0 : "-7px",
        zIndex, // Passado limpo, sem lógica de math
      }}
    >
      {status === "active" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ clipPath }}>
          <div className="animate-shimmer-glass" />
        </div>
      )}

      {status === "done" && (
        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#15803d] shadow-inner shadow-black/20 animate-check-pop">
          <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
        </div>
      )}
      
      {status === "active" && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse-luma" />
      )}
      
      {status === "future" && (
        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
      )}

      <span className="truncate">{step.label}</span>
    </div>
  );
});

// ============================================================================
// COMPONENTE: BARRA DE PROGRESSO (Sem Memo, pois muda a cada avanço)
// ============================================================================
function ProgressBar({ progressPercent }) {
  return (
    <div className="mt-3 flex h-1 w-full overflow-hidden rounded-full bg-gray-200/80 shadow-inner relative">
      <div
        className="progress-bar-anim bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 shadow-sm relative h-full"
        style={{ width: `${progressPercent}%` }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/70 to-transparent blur-[0.5px]" />
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL (Memoizado)
// ============================================================================
export default React.memo(function PedidoInternoStepper({ pedido }) {
  // A mágica da memória (TODO resolvido)
  const previousStatus = usePrevious(pedido.status);
  
  // Se for null/undefined, significa que o Drawer acabou de abrir. 
  // Anima apenas se houve transição de estado durante o ciclo de vida.
  const shouldAnimate = previousStatus && previousStatus !== pedido.status;

  if (pedido.status === "recusado") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-red-50/90 backdrop-blur-sm border border-red-200 px-4 py-3.5 shadow-sm">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 shadow-sm shadow-red-500/30">
          <XCircle className="h-4 w-4 text-white stroke-[2.5]" />
        </span>
        <span className="text-sm font-bold text-red-700">Pedido Recusado</span>
      </div>
    );
  }

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === pedido.status));
  const totalSteps = STEPS.length;
  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div className={`w-full stepper-container ${shouldAnimate ? 'is-animating' : ''}`}>
      <style>{CSS_CHOREOGRAPHY}</style>
      
      <div className="flex items-stretch overflow-visible py-1">
        {STEPS.map((step, idx) => {
          // Resolvemos o status AQUI, passando propriedades "limpas" para o filho memoizado.
          const status = idx < currentIndex ? "done" : idx === currentIndex ? "active" : "future";
          const zIndex = status === "active" ? 40 : totalSteps - idx;

          return (
            <StepperStep
              key={step.key}
              step={step}
              status={status}
              isFirst={idx === 0}
              isLast={idx === totalSteps - 1}
              zIndex={zIndex}
            />
          );
        })}
      </div>

      <ProgressBar progressPercent={progressPercent} />
    </div>
  );
});