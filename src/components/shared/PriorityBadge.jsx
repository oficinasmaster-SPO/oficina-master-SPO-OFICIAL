import React from "react";
import { ArrowDown, Minus, ArrowUp, AlertOctagon } from "lucide-react";

const PRIORITY_STYLES = {
  baixa:   { label: "Baixa",   bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ArrowDown },
  media:   { label: "Média",   bg: "bg-blue-50 text-blue-700 border-blue-200", icon: Minus },
  alta:    { label: "Alta",    bg: "bg-amber-50 text-amber-700 border-amber-200", icon: ArrowUp },
  critica: { label: "Crítica", bg: "bg-red-600 text-white border-red-700 animate-pulse", icon: AlertOctagon },
};

export default function PriorityBadge({ prioridade, className = "" }) {
  const config = PRIORITY_STYLES[prioridade?.toLowerCase()] || PRIORITY_STYLES.baixa;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}>
      <Icon className="w-3.5 h-3.5 stroke-[3]" />
      <span>{config.label}</span>
    </span>
  );
}