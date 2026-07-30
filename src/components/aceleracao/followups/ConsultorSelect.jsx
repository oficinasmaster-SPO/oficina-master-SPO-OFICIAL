import React from "react";
import { Users, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/**
 * ConsultorSelect
 * Seletor de consultor compacto em formato de pílula com borda.
 * Lista o usuário logado como default ("Meus Follow-ups"), opção "Todos"
 * e todos os consultores internos.
 *
 * Props:
 *  - value: id selecionado (user.id | "todos" | <consultor_id>)
 *  - onChange: (id) => void
 *  - consultores: [{ id, full_name, email }]
 *  - user: usuário logado (para label "Meus Follow-ups")
 */
export default function ConsultorSelect({ value, onChange, consultores = [], user }) {
  const label = (() => {
    if (!value || value === user?.id) return "Meus Follow-ups";
    if (value === "todos") return "Todos os Consultores";
    const c = consultores.find(c => c.id === value);
    return c?.full_name || c?.email || "Consultor";
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors flex-shrink-0"
        >
          <Users className="w-3.5 h-3.5 text-gray-500" />
          <span className="max-w-[140px] truncate">{label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => onChange(user?.id || "me")}
          className="gap-2 text-xs justify-between"
        >
          <span className={!value || value === user?.id ? "font-semibold" : ""}>Meus Follow-ups</span>
          {(!value || value === user?.id) && <Check className="w-3.5 h-3.5 text-gray-900" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("todos")}
          className="gap-2 text-xs justify-between"
        >
          <span className={value === "todos" ? "font-semibold" : ""}>Todos os Consultores</span>
          {value === "todos" && <Check className="w-3.5 h-3.5 text-gray-900" />}
        </DropdownMenuItem>
        {consultores.length > 0 && <div className="h-px bg-gray-100 my-1" />}
        {consultores.map(c => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => onChange(c.id)}
            className="gap-2 text-xs justify-between"
          >
            <span className="truncate">{c.full_name || c.email}</span>
            {value === c.id && <Check className="w-3.5 h-3.5 text-gray-900 flex-shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}