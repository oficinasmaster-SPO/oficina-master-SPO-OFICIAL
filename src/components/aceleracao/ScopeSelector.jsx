import React from "react";
import { Inbox, Send as SendIcon, Users } from "lucide-react";
import Combobox from "@/components/ui/combobox";

const SCOPE_OPTIONS = [
  { key: "todos",        label: "Todos os pedidos", icon: Users },
  { key: "para_mim",     label: "Para mim",         icon: Inbox },
  { key: "meus_pedidos", label: "Meus pedidos",     icon: SendIcon },
];

export default function ScopeSelector({ value, onChange }) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={SCOPE_OPTIONS}
      getOptionValue={(o) => o.key}
      getOptionLabel={(o) => o.label}
      placeholder="Todos os pedidos"
      searchPlaceholder="Pesquisar..."
      emptyText="Nenhuma opção encontrada."
      className="h-8 w-[160px]"
      renderOption={(option) => {
        const Icon = option.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[12.5px] font-medium text-gray-700">{option.label}</span>
          </div>
        );
      }}
    />
  );
}