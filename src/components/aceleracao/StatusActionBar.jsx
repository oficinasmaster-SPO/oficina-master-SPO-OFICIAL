import React from "react";
import { Play, Clock, CheckCircle, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TAREFA_STATUS_CONFIG } from "@/components/shared/backlogConstants";

// ── Chip de status (somente leitura) ──────────────────────────────────────────
const STATUS_DOT = {
  aberta: "bg-gray-400",
  em_execucao: "bg-blue-500",
  aguardando_cliente: "bg-amber-500",
  bloqueada: "bg-red-500",
  concluida: "bg-green-500",
};

function StatusChip({ status }) {
  const label = TAREFA_STATUS_CONFIG[status]?.label || status;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status] || "bg-gray-400"}`} />
      {label}
    </span>
  );
}

/**
 * StatusActionBar — barra de ação contextual que substitui o dropdown de status.
 * Os botões mudam conforme o status atual da tarefa.
 *
 * Props:
 *  - tarefa         : registro de TarefaBacklog (usa tarefa.status)
 *  - onStatusChange : (newStatus) => void
 *  - isPending      : desabilita os botões durante a mutação
 */
export default function StatusActionBar({ tarefa, onStatusChange, isPending }) {
  const status = tarefa.status;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-2.5">
      <StatusChip status={status} />

      <div className="flex-1" />

      {/* aberta → Iniciar · Bloquear · Concluir */}
      {status === "aberta" && (
        <>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={() => onStatusChange("em_execucao")}
            disabled={isPending}
          >
            <Play className="h-3.5 w-3.5" /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => onStatusChange("bloqueada")}
            disabled={isPending}
          >
            <Lock className="h-3.5 w-3.5" /> Bloquear
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => onStatusChange("concluida")}
            disabled={isPending}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Concluir
          </Button>
        </>
      )}

      {/* em_execucao → Pausar · Bloquear · Concluir */}
      {status === "em_execucao" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => onStatusChange("aguardando_cliente")}
            disabled={isPending}
          >
            <Clock className="h-3.5 w-3.5" /> Pausar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => onStatusChange("bloqueada")}
            disabled={isPending}
          >
            <Lock className="h-3.5 w-3.5" /> Bloquear
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => onStatusChange("concluida")}
            disabled={isPending}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Concluir
          </Button>
        </>
      )}

      {/* aguardando_cliente → Retomar · Concluir */}
      {status === "aguardando_cliente" && (
        <>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={() => onStatusChange("em_execucao")}
            disabled={isPending}
          >
            <Play className="h-3.5 w-3.5" /> Retomar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => onStatusChange("concluida")}
            disabled={isPending}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Concluir
          </Button>
        </>
      )}

      {/* bloqueada → Retomar · Concluir */}
      {status === "bloqueada" && (
        <>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={() => onStatusChange("em_execucao")}
            disabled={isPending}
          >
            <Play className="h-3.5 w-3.5" /> Retomar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => onStatusChange("concluida")}
            disabled={isPending}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Concluir
          </Button>
        </>
      )}

      {/* concluida → Reabrir */}
      {status === "concluida" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onStatusChange("aberta")}
          disabled={isPending}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reabrir
        </Button>
      )}
    </div>
  );
}