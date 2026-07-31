import React from "react";
import Combobox from "@/components/ui/combobox";

const SCOPE_OPTIONS = [
  { key: "todos",        label: "Todos os pedidos" },
  { key: "para_mim",     label: "Para mim" },
  { key: "meus_pedidos", label: "Meus pedidos" },
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
      autoSelectOnOpen={false}
    />
  );
}