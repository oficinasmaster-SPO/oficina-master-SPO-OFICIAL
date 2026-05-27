import React, { useState } from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ATENDIMENTO_STATUS_LABELS, ATENDIMENTO_STATUS_COLORS } from "@/components/lib/ataConstants";

/**
 * Card colapsável que agrupa atendimentos de uma mesma empresa.
 * Usado nas abas "Todos" e "Atrasados" quando o toggle "Agrupar por empresa" está ativo.
 */
export default function WorkshopGroupCard({ grupo, renderRow }) {
  const [expanded, setExpanded] = useState(true);

  // Conta por status dentro do grupo
  const statusCounts = grupo.itens.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const statusEntries = Object.entries(statusCounts);

  return (
    <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header do grupo */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-semibold text-gray-800 flex-1 text-sm truncate">{grupo.nome}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusEntries.map(([status, count]) => (
            <span
              key={status}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ATENDIMENTO_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}
            >
              {count} {ATENDIMENTO_STATUS_LABELS[status] || status}
            </span>
          ))}
          <span className="text-xs text-gray-400 font-normal ml-1">({grupo.itens.length})</span>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Rows */}
      {expanded && (
        <div className="bg-white divide-y divide-gray-100">
          {grupo.itens.map(item => renderRow(item))}
        </div>
      )}
    </div>
  );
}