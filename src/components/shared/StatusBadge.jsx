import React from "react";
import { Badge } from "@/components/ui/badge";
import { TAREFA_STATUS_CONFIG, PEDIDO_STATUS_CONFIG } from "./backlogConstants";

/**
 * StatusBadge — Badge de status padronizado para Pedido e Tarefa.
 * @param {string} entity - "tarefa" | "pedido"
 * @param {string} status - valor do status
 */
export default function StatusBadge({ entity = "tarefa", status, className = "" }) {
  const config = entity === "pedido"
    ? PEDIDO_STATUS_CONFIG[status]
    : TAREFA_STATUS_CONFIG[status];
  const fallback = { label: status || "—", className: "bg-gray-100 text-gray-800" };
  const cfg = config || fallback;
  return <Badge className={`${cfg.className} ${className}`}>{cfg.label}</Badge>;
}