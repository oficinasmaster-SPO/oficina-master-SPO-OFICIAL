import React from "react";
import { X, Filter, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRESET_LABELS = {
  "7d": "Últimos 7 dias",
  "15d": "Últimos 15 dias",
  "30d": "Últimos 30 dias",
  "mes_atual": "Mês atual",
  "custom": "Personalizado",
};

export default function ActiveFiltersBar({ filtros, consultores, onClearFilter, onClearAll }) {
  const chips = [];

  // Consultor
  if (filtros.consultorId && filtros.consultorId !== "todos") {
    const c = consultores.find(c => c.id === filtros.consultorId);
    chips.push({
      key: "consultor",
      icon: <User className="w-3 h-3" />,
      label: c?.full_name || "Consultor",
      onClear: () => onClearFilter("consultorId"),
    });
  }

  // Período
  if (filtros.preset && filtros.preset !== "mes_atual") {
    const label = filtros.preset === "custom" && filtros.dataInicio && filtros.dataFim
      ? `${formatShortDate(filtros.dataInicio)} → ${formatShortDate(filtros.dataFim)}`
      : PRESET_LABELS[filtros.preset] || filtros.preset;
    chips.push({
      key: "periodo",
      icon: <Calendar className="w-3 h-3" />,
      label,
      onClear: () => onClearFilter("preset"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Filter className="w-3.5 h-3.5" />
        <span>Filtros ativos:</span>
      </div>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
        >
          {chip.icon}
          <span className="text-xs font-medium">{chip.label}</span>
          <button
            onClick={chip.onClear}
            className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 transition-colors"
        >
          Limpar todos
        </button>
      )}
    </div>
  );
}

function formatShortDate(dateStr) {
  try {
    return format(new Date(dateStr + "T12:00:00"), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}