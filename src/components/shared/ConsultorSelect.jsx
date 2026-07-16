import React from "react";
import Combobox from "@/components/ui/combobox";

/**
 * ConsultorSelect — Select padronizado para escolha de consultor interno.
 * H2: O valor retornado é sempre User.id (não Employee.id).
 * @param {Array} usuarios - Lista de employees internos com user_id e full_name
 * @param {string} value - user_id selecionado
 * @param {Function} onChange - (userId) => void
 */
export default function ConsultorSelect({ usuarios = [], value, onChange, placeholder = "Selecione o consultor", ...props }) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={usuarios
        .filter(u => u.user_id && u.full_name)
        .map(u => ({ value: u.user_id, label: u.full_name }))
      }
      placeholder={placeholder}
      searchPlaceholder="Pesquisar consultor..."
      emptyText="Nenhum consultor interno encontrado."
      {...props}
    />
  );
}