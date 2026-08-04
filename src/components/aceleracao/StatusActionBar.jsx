import React from "react";
import { Play, Clock, CheckCircle, RotateCcw, Lock, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TAREFA_STATUS_CONFIG } from "@/components/shared/backlogConstants";

/* ── Chip de status (somente leitura) ────────────────────────────────────────── */
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

/* ── Configuração contextual por status ─────────────────────────────────────────
   PRIMARY  : botão de avanço principal (Iniciar / Pausar / Retomar / Reabrir)
   SECONDARY: ações secundárias visíveis (Bloquear, Concluir)
   Fluxo: aberta →(Iniciar)→ em_execucao →(Pausar)↔(Retomar) aguardando_cliente
        bloqueada →(Retomar)→ em_execucao · concluida →(Reabrir)→ aberta
*/
const ACTIONS = {
  aberta: {
    primary:   { label: "Iniciar",  icon: Play,        to: "em_execucao",         cls: "bg-blue-600 hover:bg-blue-700" },
    secondary: [
      { label: "Bloquear", icon: Lock,       to: "bloqueada", cls: "border-red-300 text-red-700 hover:bg-red-50" },
      { label: "Concluir", icon: CheckCircle, to: "concluida", cls: "border-green-300 text-green-700 hover:bg-green-50" },
    ],
  },
  em_execucao: {
    primary:   { label: "Pausar", icon: Pause, to: "aguardando_cliente", cls: "bg-amber-500 hover:bg-amber-600" },
    secondary: [
      { label: "Bloquear", icon: Lock,         to: "bloqueada", cls: "border-red-300 text-red-700 hover:bg-red-50" },
      { label: "Concluir", icon: CheckCircle, to: "concluida", cls: "border-green-300 text-green-700 hover:bg-green-50" },
    ],
  },
  aguardando_cliente: {
    primary:   { label: "Retomar", icon: Play, to: "em_execucao", cls: "bg-blue-600 hover:bg-blue-700" },
    secondary: [
      { label: "Concluir", icon: CheckCircle, to: "concluida", cls: "border-green-300 text-green-700 hover:bg-green-50" },
    ],
  },
  bloqueada: {
    primary:   { label: "Retomar", icon: Play, to: "em_execucao", cls: "bg-blue-600 hover:bg-blue-700" },
    secondary: [
      { label: "Concluir", icon: CheckCircle, to: "concluida", cls: "border-green-300 text-green-700 hover:bg-green-50" },
    ],
  },
  concluida: {
    primary:   { label: "Reabrir", icon: RotateCcw, to: "aberta", cls: "bg-gray-700 hover:bg-gray-800" },
    secondary: [],
  },
};

/**
 * StatusActionBar — barra de ação contextual.
 * Botão primário de avanço (Iniciar → Pausar ↔ Retomar) + ações secundárias visíveis.
 * Cada transição é registrada na aba Atividade (log criado no drawer).
 */
export default function StatusActionBar({ tarefa, onStatusChange, isPending }) {
  const status = tarefa.status;
  const cfg = ACTIONS[status] || ACTIONS.aberta;
  const PrimaryIcon = cfg.primary.icon;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-2.5">
      <StatusChip status={status} />

      <div className="flex-1" />

      {/* Botão primário de avanço */}
      <Button
        size="sm"
        className={`gap-1.5 ${cfg.primary.cls}`}
        onClick={() => onStatusChange(cfg.primary.to)}
        disabled={isPending}
      >
        <PrimaryIcon className="h-3.5 w-3.5" />
        {cfg.primary.label}
      </Button>

      {/* Ações secundárias visíveis */}
      {cfg.secondary.map((act) => {
        const Icon = act.icon;
        return (
          <Button
            key={act.label}
            size="sm"
            variant="outline"
            className={`gap-1.5 ${act.cls}`}
            onClick={() => onStatusChange(act.to)}
            disabled={isPending}
          >
            <Icon className="h-3.5 w-3.5" />
            {act.label}
          </Button>
        );
      })}
    </div>
  );
}