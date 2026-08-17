import React, { useMemo } from "react";
import Combobox from "@/components/ui/combobox";

/**
 * ConsultorSelect
 * Seletor de consultor baseado no Combobox (cmdk) com busca.
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
  const options = useMemo(() => {
    const opts = [
      // S3-01: "Todos" no topo, user logado como segunda opção
      { value: "todos", label: "Todos os Consultores" },
      { value: user?.id || "me", label: `Meus Follow-ups (${user?.full_name?.split(' ')[0] || 'eu'})` },
    ];
    consultores
      .filter(c => c.id !== user?.id) // evita duplicar o user logado
      .forEach((c) => opts.push({ value: c.id, label: c.full_name || c.email || "Consultor" }));
    return opts;
  }, [user?.id, user?.full_name, consultores]);

  return (
    <div className="w-[220px] flex-shrink-0">
      <Combobox
        options={options}
        value={value || "todos"}
        onChange={onChange}
        placeholder="Selecionar consultor..."
        searchPlaceholder="Buscar consultor..."
        emptyText="Nenhum consultor encontrado."
        clearValue="todos"
        className="h-8"
        autoSelectOnOpen={false}
      />
    </div>
  );
}