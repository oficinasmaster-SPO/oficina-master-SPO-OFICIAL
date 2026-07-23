import React from "react";
import Combobox from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

/**
 * WorkshopSearchSelect — Seleção de oficina usando o Combobox padronizado.
 * Mantém a interface { workshops, value, onValueChange, disabled }.
 */
export default function WorkshopSearchSelect({
  workshops = [],
  value,
  onValueChange,
  disabled,
  placeholder = "Selecione a oficina...",
  className,
}) {
  const options = workshops.map((w) => ({
    value: w.id,
    label: `${w.name} (${[w.city, w.state].filter(Boolean).join("/")})`,
  }));

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onValueChange}
      searchPlaceholder={placeholder}
      emptyText="Nenhuma oficina encontrada."
      className={cn(disabled && "opacity-50 pointer-events-none", className)}
    />
  );
}