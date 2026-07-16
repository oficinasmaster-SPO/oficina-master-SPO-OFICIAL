import React from "react";
import { Badge } from "@/components/ui/badge";
import { PRIORIDADE_CONFIG } from "./backlogConstants";

/**
 * PriorityBadge — Badge de prioridade padronizado.
 * @param {string} prioridade - baixa | media | alta | critica
 */
export default function PriorityBadge({ prioridade, className = "" }) {
  const cfg = PRIORIDADE_CONFIG[prioridade] || { label: prioridade || "—", className: "bg-gray-100 text-gray-800" };
  return <Badge className={`${cfg.className} ${className}`}>{cfg.label}</Badge>;
}