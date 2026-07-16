import React from "react";
import Combobox from "@/components/ui/combobox";

/**
 * ClienteSelect — Select padronizado para escolha de cliente (Workshop).
 * @param {Array} workshops - Lista de workshops { id, name }
 * @param {string} value - workshop_id selecionado
 * @param {Function} onChange - (workshopId) => void
 */
export default function ClienteSelect({ workshops = [], value, onChange, placeholder = "Selecione o cliente", ...props }) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={workshops.map(w => ({ value: w.id, label: w.name }))}
      placeholder={placeholder}
      searchPlaceholder="Pesquisar cliente..."
      emptyText="Nenhum cliente encontrado."
      {...props}
    />
  );
}