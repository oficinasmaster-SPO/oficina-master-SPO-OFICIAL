import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const STEPS = [
  { key: "pendente",   label: "Pendente"    },
  { key: "em_analise", label: "Em Análise"  },
  { key: "aprovado",   label: "Aprovado"    },
  { key: "concluido",  label: "Concluído"   },
];

// Quais transições são permitidas a partir de cada status
const ALLOWED_TRANSITIONS = {
  pendente:   ["em_analise"],
  em_analise: ["aprovado", "pendente"],
  aprovado:   ["concluido", "em_analise"],
  concluido:  [],
  recusado:   [],
};

export default function PedidoInternoStepper({ pedido, canEdit = false }) {
  const queryClient = useQueryClient();

  const transitionMutation = useMutation({
    mutationFn: async (newStatus) => {
      const extra = {};
      if (newStatus === "concluido") extra.data_conclusao = new Date().toISOString();
      if (!pedido.data_primeira_resposta && newStatus !== "pendente")
        extra.data_primeira_resposta = new Date().toISOString();
      await base44.entities.PedidoInterno.update(pedido.id, {
        status: newStatus,
        ...extra,
      });
    },
    onSuccess: (_, newStatus) => {
      const labels = {
        em_analise: "Pedido movido para Em Análise",
        aprovado:   "Pedido aprovado!",
        concluido:  "Pedido concluído!",
        pendente:   "Pedido voltou para Pendente",
      };
      toast.success(labels[newStatus] || "Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  // ── Recusado: banner especial ──────────────────────────────────────────────
  if (pedido.status === "recusado") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500">
          <Check className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="text-sm font-semibold text-red-700">Pedido Recusado</span>
        {canEdit && (
          <button
            onClick={() => transitionMutation.mutate("pendente")}
            disabled={transitionMutation.isPending}
            className="ml-auto text-xs text-red-500 underline hover:text-red-700"
          >
            Reabrir
          </button>
        )}
      </div>
    );
  }

  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === pedido.status));
  const allowed = ALLOWED_TRANSITIONS[pedido.status] || [];

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const isDone   = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isFuture = idx > currentIndex;

        // Pode clicar se canEdit + essa transição é permitida
        const isClickable = canEdit && allowed.includes(step.key) && !transitionMutation.isPending;

        return (
          <React.Fragment key={step.key}>
            {/* Nó do step */}
            <button
              onClick={() => isClickable && transitionMutation.mutate(step.key)}
              disabled={!isClickable}
              title={isClickable ? `Mover para "${step.label}"` : undefined}
              className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all
                ${isClickable
                  ? "cursor-pointer hover:bg-blue-50"
                  : "cursor-default"
                }
              `}
            >
              {/* Bolinha */}
              <span className={`
                relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                text-[10px] font-bold transition-all
                ${isDone    ? "bg-green-500 text-white"
                : isActive  ? "bg-blue-500 text-white ring-4 ring-blue-100"
                : isClickable ? "bg-gray-200 text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700"
                : "bg-gray-100 text-gray-300"}
              `}>
                {isDone
                  ? <Check className="h-3.5 w-3.5" />
                  : idx + 1
                }
                {/* Pulse animado no step ativo */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20" />
                )}
              </span>

              {/* Label */}
              <span className={`text-xs font-medium whitespace-nowrap
                ${isDone     ? "text-green-700"
                : isActive   ? "text-blue-700"
                : isClickable ? "text-gray-500 group-hover:text-blue-600"
                : "text-gray-300"}
              `}>
                {step.label}
                {isClickable && (
                  <span className="ml-1 text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ← mover
                  </span>
                )}
              </span>
            </button>

            {/* Conector */}
            {idx < STEPS.length - 1 && (
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors
                ${isDone ? "text-green-400" : "text-gray-200"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
