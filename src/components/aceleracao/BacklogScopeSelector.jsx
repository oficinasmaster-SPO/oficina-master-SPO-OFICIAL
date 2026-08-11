import React from "react";
import Combobox from "@/components/ui/combobox";

// Espelho do ScopeSelector do PedidoInterno, com opções de escopo do Backlog
// de Tarefas. Mesmo posicionamento e dimensões (h-8 w-[160px]) para manter o
// padrão da UI e evitar layout shift entre as duas abas.
const SCOPE_OPTIONS = [
  { key: "todos", label: "Todas tarefas" },
  { key: "minhas", label: "Minhas tarefas" },
];

export default function BacklogScopeSelector({ value, onChange }) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={SCOPE_OPTIONS}
      getOptionValue={(o) => o.key}
      getOptionLabel={(o) => o.label}
      placeholder="Todas tarefas"
      searchPlaceholder="Pesquisar..."
      emptyText="Nenhuma opção encontrada."
      className="h-8 w-[160px]"
      autoSelectOnOpen={false}
    />
  );
}