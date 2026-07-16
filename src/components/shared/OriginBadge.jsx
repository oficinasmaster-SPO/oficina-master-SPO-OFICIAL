import React from "react";
import { Badge } from "@/components/ui/badge";
import { ORIGIN_LABELS } from "./backlogConstants";

/**
 * OriginBadge — Badge de origem padronizado para TarefaBacklog.
 * @param {string} originType - valor de origin_type
 */
export default function OriginBadge({ originType, className = "" }) {
  const label = ORIGIN_LABELS[originType] || originType || "—";
  return <Badge variant="outline" className={`text-xs ${className}`}>{label}</Badge>;
}